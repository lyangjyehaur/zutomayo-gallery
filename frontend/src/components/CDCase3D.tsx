import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';

interface CDCase3DProps {
  imgUrl: string;
  className?: string;
  onReady?: () => void;
}

export function CDCase3D({ imgUrl, className = '', onReady }: CDCase3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 使用 ref 來標記是否已經執行過 onReady，避免重複觸發
  const hasNotifiedReady = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // 1. 初始化場景
    const scene = new THREE.Scene();
    const { clientWidth, clientHeight } = container;
    const camera = new THREE.PerspectiveCamera(35, clientWidth / clientHeight, 0.1, 100);
    camera.position.z = 4.2;

    // 2. 初始化渲染器
    // powerPreference: "high-performance" 提示瀏覽器使用獨立顯卡 (如果有)
    // precision: "mediump" 降低著色器精度，平衡效能與畫質
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true, // 重新開啟反鋸齒以改善邊緣品質
        alpha: true, 
        powerPreference: "high-performance",
        precision: "mediump"
    });
    renderer.setSize(clientWidth, clientHeight);
    // 稍微提高 Pixel Ratio 上限至 1.25，這是在 Retina 螢幕上平衡效能與畫質的甜密點
    // 這樣既不會像 1.0 那麼糊，也不會像 2.0/3.0 那樣吃掉巨量 GPU
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    container.appendChild(renderer.domElement);

    // 3. 建立 3D 物件群組
    const cdBox = new THREE.Group();
    cdBox.position.x = 0.08;
    scene.add(cdBox);

    // --- 材質定義 ---
    const frontCoverMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transmission: 0.99,      
        thickness: 0.25,         
        roughness: 0.05,        
        ior: 1.5,               
        clearcoat: 0.2,         
        clearcoatRoughness: 0.4,
        transparent: true,
        opacity: 0.2,           
        depthWrite: false,      
        side: THREE.FrontSide   
    });

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

    const backTrayMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,        
        roughness: 0.6,         
        metalness: 0.2,         
        depthWrite: true
    });

    const hingeMat = new THREE.MeshStandardMaterial({ 
        color: 0x111111,     
        roughness: 0.5,      
        metalness: 0.1,     
        depthWrite: true
    });

    // --- 幾何體建構 ---
    const scale = 0.6;
    const shellWidth = 3.0 * scale; 
    const shellHeight = 2.9 * scale;

    const frontMaterials = [edgeMat, edgeMat, edgeMat, edgeMat, frontCoverMat, frontCoverMat];
    // 微調 Segment 以改善光影過渡的平滑度，避免大面材質產生明顯的切面
    const frontCoverGeo = new THREE.BoxGeometry(shellWidth, shellHeight, 0.11 * scale, 2, 2, 1);
    const frontCover = new THREE.Mesh(frontCoverGeo, frontMaterials);
    frontCover.position.set(0.1 * scale, 0, 0.10 * scale); 
    cdBox.add(frontCover);

    const backMaterials = [edgeMat, edgeMat, edgeMat, edgeMat, backTrayMat, backTrayMat];
    const backTrayGeo = new THREE.BoxGeometry(shellWidth, shellHeight, 0.18 * scale, 2, 2, 1);
    const backTray = new THREE.Mesh(backTrayGeo, backMaterials);
    backTray.position.set(0.1 * scale, 0, -0.05 * scale); 
    cdBox.add(backTray);

    // --- 封面圖片 ---
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    
    const paperWidth = 2.9 * scale; 
    const paperHeight = 2.8 * scale;
    const paperGeo = new THREE.BoxGeometry(paperWidth, paperHeight, 0.01 * scale, 2, 2, 1);
    
    let isTextureLoaded = false;
    const coverTex = loader.load(imgUrl, () => {
        isTextureLoaded = true;
    }, undefined, () => {
        isTextureLoaded = true; // Error fallback
    });
    coverTex.colorSpace = THREE.SRGBColorSpace;
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
    paper.position.set(0.1 * scale, 0, 0.04 * scale);
    cdBox.add(paper);

    // --- 轉軸與裝飾 ---
    const spineGroup = new THREE.Group();
    
    const hingeGeo = new THREE.BoxGeometry(0.24 * scale, shellHeight, 0.28 * scale, 1, 1, 1);
    const hinge = new THREE.Mesh(hingeGeo, hingeMat);
    spineGroup.add(hinge);
    
    const capGeo = new THREE.BoxGeometry(0.26 * scale, 0.05 * scale, 0.30 * scale, 1, 1, 1);
    const capTop = new THREE.Mesh(capGeo, hingeMat);
    capTop.position.y = 1.425 * scale;
    spineGroup.add(capTop);
    
    const capBottom = new THREE.Mesh(capGeo, hingeMat);
    capBottom.position.y = -1.425 * scale;
    spineGroup.add(capBottom);

    const stripeGeo = new THREE.BoxGeometry(0.02 * scale, 2.85 * scale, 0.02 * scale, 1, 1, 1);
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.1 });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(-0.08 * scale, 0, 0.11 * scale); 
    spineGroup.add(stripe);

    spineGroup.position.set(-1.515 * scale, 0, 0.015 * scale);
    cdBox.add(spineGroup);

    // --- 燈光系統 ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.6)); 
    // 降低聚光燈的陰影計算成本 (這裡本來就沒有開啟 castShadow，但減少 penumbra 和 angle 也有幫助)
    const spotLight = new THREE.SpotLight(0xffffff, 10, 0, Math.PI / 3, 0.5, 1);
    spotLight.position.set(5, 5, 6);
    scene.add(spotLight);

    // --- 互動邏輯 ---
    let mouseX = 0, mouseY = 0;
    let currentRX = 0, currentRY = 0;
    let currentLightX = 0, currentLightY = 0;
    
    const handleMouseMove = (e: MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const trueWidth = rect.width / 1.4;
        const trueHeight = rect.height / 1.4;
        
        // 我們直接綁定在 container 上，所以一定是在內部或附近，不需要判斷 isInside 也能有更好的跟隨效果
        mouseX = ((e.clientX - centerX) / (trueWidth / 2)) * 1.8;
        mouseY = ((e.clientY - centerY) / (trueHeight / 2)) * 1.8;
    };

    const handleMouseLeave = () => {
        mouseX = 0;
        mouseY = 0;
    };
    
    // 將事件綁定到 container 而不是 window，避免效能問題和全域監聽器
    container.addEventListener('mousemove', handleMouseMove, { passive: true });
    container.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    // --- 動畫迴圈 ---
    let reqId: number;
    let frameCount = 0;

    // 用於上下浮動動畫的時間變數
    let time = 0;
    // 隨機初始相位，讓每張卡片的浮動不同步，看起來更自然
    const randomPhase = Math.random() * Math.PI * 2;

    function animate() {
        reqId = requestAnimationFrame(animate);
        frameCount++;
        time += 0.015; // 控制浮動速度
        
        // 1. 滑鼠互動目標值
        const targetRX = mouseY * 0.2;
        const targetRY = mouseX * 0.3;
        currentRX += (targetRX - currentRX) * 0.05;
        currentRY += (targetRY - currentRY) * 0.05;

        // 2. 待機時的上下浮動與微小呼吸旋轉
        const isHovering = mouseX !== 0 || mouseY !== 0;
        
        // 使用 Math.sin 產生平滑的上下位移 (縮小幅度)
        const floatY = Math.sin(time * 1.5 + randomPhase) * 0.035; 
        cdBox.position.y = floatY;

        // 如果滑鼠不在上面，給它一個微小的自轉呼吸感
        if (!isHovering) {
            const floatRX = Math.sin(time * 0.8 + randomPhase) * 0.05;
            const floatRY = Math.cos(time * 0.6 + randomPhase) * 0.08;
            cdBox.rotation.x = currentRX + floatRX;
            cdBox.rotation.y = currentRY + floatRY;
        } else {
            cdBox.rotation.x = currentRX;
            cdBox.rotation.y = currentRY;
        }
        
        // 3. 燈光跟隨
        const targetLightX = mouseX * 8.0;
        const targetLightY = -mouseY * 8.0;
        currentLightX += (targetLightX - currentLightX) * 0.3;
        currentLightY += (targetLightY - currentLightY) * 0.3;
        
        spotLight.position.x = currentLightX;
        spotLight.position.y = currentLightY;
        spotLight.target.position.set(0, 0, 0);
        spotLight.target.updateMatrixWorld();
        
        renderer.render(scene, camera);
        
        // 核心邏輯：等待圖片加載並渲染穩定 (第 3 幀)，才通知外部
        // 在低效能模式或卷動過程中，我們只在 hover 狀態或特定條件下才更新渲染，
        // 但這裡我們保持 60FPS 讓動畫平滑，依賴前面的 observer 來銷毀畫布
        if (isTextureLoaded && frameCount > 2 && !hasNotifiedReady.current) {
            hasNotifiedReady.current = true;
            // 延遲一小段時間確保 React 狀態更新不會發生衝突
            setTimeout(() => {
                if (onReady) onReady();
            }, 50);
        }
    }
    animate();

    // 兜底機制：如果超過 1 秒還沒觸發（例如背景分頁或 rAF 被阻擋），強制顯示
    const fallbackTimeout = setTimeout(() => {
        if (!hasNotifiedReady.current) {
            hasNotifiedReady.current = true;
            if (onReady) onReady();
        }
    }, 1000);

    const handleResize = () => {
        if (!containerRef.current) return;
        const { clientWidth, clientHeight } = containerRef.current;
        camera.aspect = clientWidth / clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(clientWidth, clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(fallbackTimeout);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(reqId);
      
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      
      renderer.forceContextLoss();
      renderer.dispose();
      
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
  }, [imgUrl]);

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-full ${className}`}
      style={{ minHeight: '100%', minWidth: '100%' }}
    />
  );
}