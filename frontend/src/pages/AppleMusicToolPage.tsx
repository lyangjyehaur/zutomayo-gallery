import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Image as ImageIcon, Download, Loader2, AlertCircle, Music } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export default function AppleMusicToolPage() {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    title: string;
    artist: string;
    highResUrl: string;
    fallbackUrl: string;
    artworkBaseUrl: string;
    type: string;
  } | null>(null);

  const parseAppleMusicUrl = async (inputUrl: string) => {
    try {
      setLoading(true);
      setError('');
      setResult(null);

      // Extract ID from URL
      // Examples: 
      // https://music.apple.com/jp/album/hunch-gray-single/1551139414
      // https://music.apple.com/us/album/time-left/1614948834\?i\=1614948835
      const urlObj = new URL(inputUrl);
      const pathParts = urlObj.pathname.split('/');
      const idMatch = pathParts[pathParts.length - 1].match(/\d+/);
      
      // If there's an ?i= query param, it's a specific song
      const songId = urlObj.searchParams.get('i');
      const albumId = idMatch ? idMatch[0] : null;

      const targetId = songId || albumId;

      if (!targetId) {
        throw new Error(t('timeline.fetcher_err_invalid_url', 'Invalid Apple Music URL. Could not find ID.'));
      }

      const entity = songId ? 'song' : 'album';
      const fetchUrl = `https://itunes.apple.com/lookup?id=${targetId}&entity=${entity}&country=jp`;

      const response = await fetch(fetchUrl);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        const artwork = item.artworkUrl100;
        
        if (!artwork) {
          throw new Error(t('timeline.fetcher_err_no_artwork', 'No artwork found for this item.'));
        }

        const highResUrl = artwork.replace('100x100bb.jpg', '10000x10000-999.png');
        const fallbackUrl = artwork.replace('100x100bb.jpg', '10000x10000bb.png');
        const artworkBaseUrl = artwork.replace('100x100bb.jpg', '');

        setResult({
          title: item.collectionName || item.trackName,
          artist: item.artistName,
          highResUrl,
          fallbackUrl,
          artworkBaseUrl,
          type: item.wrapperType === 'track' ? 'Song' : 'Album'
        });
      } else {
        throw new Error(t('timeline.fetcher_err_not_found', 'Item not found on Apple Music.'));
      }
    } catch (err: any) {
      // 攔截原生的 URL 解析錯誤
      if (err instanceof TypeError && err.message.includes('Invalid URL')) {
        setError(t('timeline.fetcher_err_invalid_url', 'Invalid Apple Music URL. Could not find ID.'));
      } else {
        // 這裡直接取用 throw 過來的 Error 訊息，或是給予預設錯誤訊息
        setError(err.message || t('timeline.fetcher_err_failed', 'Failed to parse URL.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      // Create an anchor tag to trigger download
      // Using fetch to get blob and bypass some browser download behaviors
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = objectUrl;
      
      // 動態取得副檔名，確保不會寫死 jpg
      const extMatch = url.match(/\.([a-zA-Z0-9]+)$/);
      const ext = extMatch ? extMatch[1].toLowerCase() : 'png';
      
      // 確保 filename 沒有重複的副檔名
      const finalFilename = filename.toLowerCase().endsWith(`.${ext}`) ? filename : `${filename}.${ext}`;
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="text-center space-y-4">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight flex items-center justify-center gap-3">
          <i className="hn hn-music-solid text-[40px] md:text-[48px]"></i>
          {t('timeline.fetcher_title', 'Apple Music Cover Fetcher')}
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">
          {t('timeline.fetcher_desc', "Paste any Apple Music Album or Song URL to extract the highest possible resolution, uncompressed original artwork directly from Apple's servers.")}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t('timeline.fetcher_placeholder', "e.g. https://music.apple.com/jp/album/hunch-gray-single/1551139414")}
          className="flex-1 text-base h-14 border-4 border-black focus-visible:ring-0 focus-visible:border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white dark:bg-zinc-950 px-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && url) {
              parseAppleMusicUrl(url);
            }
          }}
        />
        <Button 
          onClick={() => parseAppleMusicUrl(url)}
          disabled={!url || loading}
          className="h-14 px-10 text-lg font-bold bg-main hover:bg-main/90 text-black border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all rounded-none"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('timeline.fetcher_btn', 'Extract')}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border-4 border-red-500 text-red-500 flex items-center gap-3">
          <i className="hn hn-octagon-times text-2xl shrink-0"></i>
          <p className="font-bold">{error}</p>
        </div>
      )}

      {result && (
        <div className="grid md:grid-cols-2 gap-8 items-start mt-8">
          <div className="space-y-4">
            <div className="aspect-square relative border-4 border-black overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-black/5">
              <img 
                src={result.highResUrl} 
                alt={result.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to bb.jpg if -999.jpg doesn't exist
                  (e.target as HTMLImageElement).src = result.fallbackUrl;
                }}
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 transition-opacity flex items-center justify-center gap-4">
                <a 
                  href={result.highResUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-4 bg-white text-black transition-transform"
                  title="Open in new tab"
                >
                  <ImageIcon className="w-6 h-6" />
                </a>
              </div>
            </div>
          </div>

          <div className="space-y-6 bg-black/5 dark:bg-white/5 p-6 md:p-8 border-4 border-black">
            <div>
              <div className="inline-block px-3 py-1 mb-4 bg-black text-white dark:bg-white dark:text-black font-bold text-xs uppercase tracking-wider rounded-none">
                {result.type}
              </div>
              <h2 className="text-3xl font-black mb-2 leading-tight">{result.title}</h2>
              <p className="text-xl font-bold text-muted-foreground">{result.artist}</p>
            </div>

            <div className="space-y-4 pt-6 border-t-2 border-black/10 dark:border-white/10">
              <Button 
                onClick={() => handleDownload(result.highResUrl, `${result.artist} - ${result.title}`)}
                className="w-full h-14 text-lg font-bold flex items-center justify-center gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all rounded-none"
              >
                <Download className="w-5 h-5" />
                {t('timeline.fetcher_download', 'Download Original')}
              </Button>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                {[
                  { label: '3000px', suffix: '3000x3000bb.jpg' },
                  { label: '1500px', suffix: '1500x1500bb.jpg' },
                  { label: '1000px', suffix: '1000x1000bb.jpg' },
                  { label: '600px', suffix: '600x600bb.jpg' }
                ].map((res) => (
                  <Button
                    key={res.label}
                    variant="outline"
                    onClick={() => handleDownload(`${result.artworkBaseUrl}${res.suffix}`, `${result.artist} - ${result.title} (${res.label})`)}
                    className="w-full h-10 text-xs font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all rounded-none flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3 h-3 shrink-0" />
                    <span>{res.label}</span>
                  </Button>
                ))}
              </div>

              <div className="text-sm text-center text-muted-foreground pt-4">
                <p>{t('timeline.fetcher_fallback_hint', 'If the original fails to load, it will fallback to the high-res compressed version.')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
