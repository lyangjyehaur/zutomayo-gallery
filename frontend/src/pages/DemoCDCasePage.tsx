import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import * as THREE from 'three';

// ============================================================================
// Ultra-Realistic Physical CD Case
// 使用 Three.js 物理材質 (MeshPhysicalMaterial) + 房間環境光 (RoomEnvironment)
// ============================================================================

export function DemoCDCasePage() {
  const navigate = useNavigate();
  const basePath = import.meta.env.VITE_ROUTER_BASE || '/';
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // 1. 初始化場景、相機、渲染器
    const scene = new THREE.Scene();
    // 使用深色背景，更能突顯透明壓克力的反光質感
    scene.background = new THREE.Color(0x111111); 

    const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 8;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // 物理渲染關鍵：開啟正確的色調映射與色彩空間
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 2. 移除複雜的 HDRI 環境光反射 (RoomEnvironment)
    // 我們不要真實的窗戶反射，而是使用最基礎的打光方式來創造一個完全打散的柔和圓形反光
    // 已經不需要 RectAreaLight，刪除相關初始化
    
    // --- 物理外盒群組 ---
    const cdBox = new THREE.Group();
    scene.add(cdBox);

    // ==========================================
    // 材質定義 (Materials)
    // ==========================================
    
    // 前蓋大面：極度平滑的高透光壓克力 (像玻璃一樣)
    const frontCoverMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transmission: 0.99,      
        thickness: 0.25,         
        roughness: 0.05,        
        ior: 1.5,               
        clearcoat: 0.5,         // 將清漆強度降低一半 (原本 1.0)，避免反光過於死白
        clearcoatRoughness: 0.4,// 增加清漆粗糙度 (原本 0.3)，讓高光暈開得更均勻，不刺眼
        transparent: true,
        opacity: 0.2,           
        depthWrite: false,      
        side: THREE.FrontSide   
    });

    // 壓克力側面：模擬切割邊緣的微粗糙泛白感
    const edgeMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transmission: 0.8,      
        thickness: 0.5,
        roughness: 0.4,         
        ior: 1.5,
        transparent: true,
        opacity: 0.9,           
        side: THREE.DoubleSide
    });

    // 後底殼：通常是深色或不透明的塑膠托盤
    const backTrayMat = new THREE.MeshPhysicalMaterial({
        color: 0x1a1a1a,        
        roughness: 0.6,         
        metalness: 0.2,         
        clearcoat: 0.1,         
        depthWrite: true
    });

    // 轉軸 (Spine)：與底殼同材質，但通常更光滑一點
    const hingeMat = new THREE.MeshPhysicalMaterial({ 
        color: 0x111111,     
        roughness: 0.5,      
        metalness: 0.1,     
        clearcoat: 0.1,      
        depthWrite: true
    });

    // ==========================================
    // 幾何體建構 (Geometry)
    // ==========================================
    
    const shellWidth = 3.0; 
    const shellHeight = 2.9;

    // 1. 前蓋 (Front Cover)
    const frontMaterials = [edgeMat, edgeMat, edgeMat, edgeMat, frontCoverMat, frontCoverMat];
    const frontCoverGeo = new THREE.BoxGeometry(shellWidth, shellHeight, 0.05);
    const frontCover = new THREE.Mesh(frontCoverGeo, frontMaterials);
    frontCover.position.set(0.1, 0, 0.08); 
    cdBox.add(frontCover);

    // 2. 後底殼 (Back Tray)
    const backMaterials = [edgeMat, edgeMat, edgeMat, edgeMat, backTrayMat, backTrayMat];
    const backTrayGeo = new THREE.BoxGeometry(shellWidth, shellHeight, 0.12);
    const backTray = new THREE.Mesh(backTrayGeo, backMaterials);
    backTray.position.set(0.1, 0, -0.03); 
    cdBox.add(backTray);

    // 3. 封面紙張 (Paper) - 夾在中間
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    const imgUrl = 'https://is1-ssl.mzstatic.com/image/thumb/Music113/v4/b7/fe/4c/b7fe4cb4-fb88-578c-d58d-f650043ff298/19UMGIM82675.rgb.jpg/1000x1000.jpg';
    
    // 封面稍微小於外殼 (3.0 x 2.9)，確保留有邊框
    const paperWidth = 2.9; 
    const paperHeight = 2.8;
    const paperGeo = new THREE.BoxGeometry(paperWidth, paperHeight, 0.01);
    
    const coverTex = loader.load(imgUrl);
    coverTex.colorSpace = THREE.SRGBColorSpace;
    // 將紙張改回 MeshBasicMaterial 或是極低反光的材質，避免紙張本身也反射出死白的光塊
    const paperFrontMat = new THREE.MeshLambertMaterial({ 
        map: coverTex, 
        depthWrite: true 
    });
    const paper = new THREE.Mesh(paperGeo, [
        new THREE.MeshBasicMaterial({color:0xdddddd}),
        new THREE.MeshBasicMaterial({color:0xdddddd}),
        new THREE.MeshBasicMaterial({color:0xdddddd}),
        new THREE.MeshBasicMaterial({color:0xdddddd}),
        paperFrontMat,
        new THREE.MeshStandardMaterial({color:0xdddddd, roughness: 0.9})
    ]);
    paper.position.set(0.1, 0, 0.04); // 完美夾在 0.08 (前) 與 -0.03 (後) 之間
    cdBox.add(paper);

    // 4. 左側轉軸 (Spine)
    const spineGroup = new THREE.Group();
    
    const hingeGeo = new THREE.BoxGeometry(0.3, shellHeight, 0.20);
    const hinge = new THREE.Mesh(hingeGeo, hingeMat);
    spineGroup.add(hinge);
    
    // 轉軸上下方的卡榫結構
    const capGeo = new THREE.BoxGeometry(0.32, 0.05, 0.22);
    const capTop = new THREE.Mesh(capGeo, hingeMat);
    capTop.position.y = 1.425;
    spineGroup.add(capTop);
    
    const capBottom = new THREE.Mesh(capGeo, hingeMat);
    capBottom.position.y = -1.425;
    spineGroup.add(capBottom);

    // 轉軸左側的高光溝槽裝飾 (讓側面不那麼單調)
    const stripeGeo = new THREE.BoxGeometry(0.02, 2.85, 0.02);
    const stripeMat = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.1, clearcoat: 1.0 });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(-0.15, 0, 0.08); 
    spineGroup.add(stripe);

    // 精準放置轉軸，留 0.005 間隙防閃爍
    spineGroup.position.set(-1.555, 0, 0);
    cdBox.add(spineGroup);

    // ==========================================
    // 燈光系統 (還原為初始的 AmbientLight + SpotLight，並調整亮度)
    // ==========================================
    scene.add(new THREE.AmbientLight(0xffffff, 0.8)); 
    
    // 降低聚光燈的強度 (原本是 80，現在降到 30)，解決畫面過曝的問題
    const spotLight = new THREE.SpotLight(0xffffff, 30, 0, Math.PI / 2, 1, 1);
    // 將燈光稍微往後退一點 (Z=6)，讓打下來的光暈範圍更大、更均勻，不會過度集中在中間
    spotLight.position.set(5, 5, 6);
    scene.add(spotLight);

    // ==========================================
    // 交互與動畫邏輯
    // ==========================================
    let mouseX = 0, mouseY = 0;
    // 加入平滑緩動 (Lerp) 變數
    let currentRX = 0, currentRY = 0;
    
    const handleMouseMove = (e: MouseEvent) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let reqId: number;
    function animate() {
        reqId = requestAnimationFrame(animate);
        
        // 目標旋轉角度 (限制在一定範圍內，更像展示品)
        const targetRX = mouseY * 0.3;
        const targetRY = mouseX * 0.4;
        
        // 極致平滑的緩動 (Lerp)
        currentRX += (targetRX - currentRX) * 0.05;
        currentRY += (targetRY - currentRY) * 0.05;
        
        cdBox.rotation.x = currentRX;
        cdBox.rotation.y = currentRY;
        
        // 讓巨大的聚光燈隨滑鼠位移
        // 燈光退回到 Z=6，位移倍率可以稍微調回 3.5，讓光點移動更平滑
        spotLight.position.x = mouseX * 3.5;
        spotLight.position.y = -mouseY * 3.5;
        // 確保燈光永遠對準盒子中心
        spotLight.target.position.set(0, 0, 0);
        spotLight.target.updateMatrixWorld();
        
        // 微微的上下浮動呼吸感
        cdBox.position.y = Math.sin(Date.now() * 0.001) * 0.05;
        
        renderer.render(scene, camera);
    }
    animate();

    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(reqId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      
      // 釋放資源
      frontCoverGeo.dispose();
      frontCoverMat.dispose();
      backTrayGeo.dispose();
      backTrayMat.dispose();
      edgeMat.dispose();
      paperGeo.dispose();
      paperFrontMat.dispose();
      coverTex.dispose();
      hingeGeo.dispose();
      hingeMat.dispose();
      capGeo.dispose();
      stripeGeo.dispose();
      stripeMat.dispose();
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#111] flex flex-col font-sans overflow-hidden">
      {/* 導航列 */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-6 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="flex flex-col text-white">
          <h2 className="text-2xl font-black uppercase tracking-tight">
            Three.js CD Case
          </h2>
          <span className="text-[10px] font-mono opacity-50 normal-case">
            /demo/cd-case (Ultra-Realistic HDRI Environment)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="bg-black/50 border-white/20 text-white hover:bg-white hover:text-black transition-colors" onClick={() => navigate(-1)}>
            <i className="hn hn-arrow-left mr-2" />
            返回
          </Button>
          <Button variant="outline" className="bg-black/50 border-white/20 text-white hover:bg-white hover:text-black transition-colors" onClick={() => navigate(basePath)}>
            <i className="hn hn-home mr-2" />
            回首頁
          </Button>
        </div>
      </div>

      {/* Three.js 畫布容器 */}
      <div 
        ref={containerRef} 
        className="flex-1 w-full h-full cursor-grab active:cursor-grabbing" 
      />
    </div>
  );
}