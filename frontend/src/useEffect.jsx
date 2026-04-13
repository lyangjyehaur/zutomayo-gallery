useEffect(() => {
  if (galleryRef.current) {
    const msnry = new Masonry(galleryRef.current, { ...options });
    return () => msnry.destroy(); // 組件卸載時清理
  }
}, [data]); // 當數據變化時重新計算佈局
