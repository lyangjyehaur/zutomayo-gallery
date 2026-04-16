import * as React from 'react';
import { useMemo, useState } from 'react';
import { MVDetailsModal } from '@/components/MVDetailsModal';
import type { MVItem } from '@/lib/types';
import { getLightboxProvider, setLightboxProvider } from '@/config';

export default function DebugMVModalLightbox() {
  const [open, setOpen] = useState(false);
  const provider = getLightboxProvider();

  const mv = useMemo<MVItem>(
    () => ({
      id: 'debug-mv',
      title: 'Debug MV (Lightbox Provider Switch)',
      year: '2026',
      date: '04-16',
      album: ['DEBUG_ALBUM'],
      artist: 'DEBUG_ARTIST',
      youtube: '',
      bilibili: '',
      description: 'This is a debug modal to validate LightGallery/Fancybox integration.',
      coverImages: [],
      keywords: ['debug', 'lightbox'],
      images: [
        {
          url:
            'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221200%22 height=%22800%22 viewBox=%220 0 1200 800%22%3E%3Crect width=%221200%22 height=%22800%22 fill=%22%2300ff9d%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22monospace%22 font-size=%2256%22 fill=%22%23000000%22%3EMODAL_01%3C/text%3E%3C/svg%3E',
          caption: 'MODAL_01',
          richText:
            '<div class="author">SYSTEM</div><div class="post">Open modal → click image → verify toolbar & navigation.</div><div class="translation"></div>',
          alt: 'MODAL_01',
          width: 1200,
          height: 800,
        },
        {
          url:
            'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22900%22 height=%221200%22 viewBox=%220 0 900 1200%22%3E%3Crect width=%22900%22 height=%221200%22 fill=%22%2300aeec%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22monospace%22 font-size=%2256%22 fill=%22%23ffffff%22%3EMODAL_02%3C/text%3E%3C/svg%3E',
          caption: 'MODAL_02 (Long text test)',
          richText:
            '<p lang="ja" class="author"><span>ACAね</span><span>@zutomayo</span><a href="xxxxxxx" target="_blank">原推文</a></p><p lang="ja" class="post">ultra魂 キャラデザ可愛いです\nベルトにカセット\n昼にら・夜にら・グレイくん</p><p class="translation">ultra魂的角色設計很可愛\n腰帶上還有磁帶\n晝Nira・夜Nira・Gray君</p>',
          alt: 'MODAL_02',
          width: 900,
          height: 1200,
        },
        {
          url:
            'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221400%22 height=%22900%22 viewBox=%220 0 1400 900%22%3E%3Crect width=%221400%22 height=%22900%22 fill=%22%23111111%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22monospace%22 font-size=%2256%22 fill=%22%23bcff00%22%3EMODAL_03%3C/text%3E%3C/svg%3E',
          caption: 'MODAL_03',
          richText:
            '<div class="author">SYSTEM</div><div class="post">Dialog should stay open while lightbox is open.</div><div class="translation"></div>',
          alt: 'MODAL_03',
          width: 1400,
          height: 900,
        },
        {
          url:
            'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221000%22 height=%221000%22 viewBox=%220 0 1000 1000%22%3E%3Crect width=%221000%22 height=%221000%22 fill=%22%23ff4d4f%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22monospace%22 font-size=%2256%22 fill=%22%23ffffff%22%3EMODAL_04%3C/text%3E%3C/svg%3E',
          caption: 'MODAL_04',
          richText:
            '<div class="author">SYSTEM</div><div class="post">Use download button to test downloadSrc pipeline.</div><div class="translation"></div>',
          alt: 'MODAL_04',
          width: 1000,
          height: 1000,
        },
        {
          url:
            'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%221200%22 viewBox=%220 0 800 1200%22%3E%3Crect width=%22800%22 height=%221200%22 fill=%22%239c27b0%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22monospace%22 font-size=%2256%22 fill=%22%23ffffff%22%3EMODAL_05%3C/text%3E%3C/svg%3E',
          caption: 'MODAL_05',
          richText:
            '<div class="author">SYSTEM</div><div class="post">Additional image to test Masonry layout grid filling.</div><div class="translation"></div>',
          alt: 'MODAL_05',
          width: 800,
          height: 1200,
        },
        {
          url:
            'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221200%22 height=%221200%22 viewBox=%220 0 1200 1200%22%3E%3Crect width=%221200%22 height=%221200%22 fill=%22%23fa8c16%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22monospace%22 font-size=%2256%22 fill=%22%23ffffff%22%3EMODAL_06%3C/text%3E%3C/svg%3E',
          caption: 'MODAL_06',
          richText:
            '<div class="author">SYSTEM</div><div class="post">Additional image to test Masonry layout grid filling.</div><div class="translation"></div>',
          alt: 'MODAL_06',
          width: 1200,
          height: 1200,
        },
        {
          url:
            'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221600%22 height=%22900%22 viewBox=%220 0 1600 900%22%3E%3Crect width=%221600%22 height=%22900%22 fill=%22%2313c2c2%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22monospace%22 font-size=%2256%22 fill=%22%23ffffff%22%3EMODAL_07%3C/text%3E%3C/svg%3E',
          caption: 'MODAL_07',
          richText:
            '<div class="author">SYSTEM</div><div class="post">Additional image to test Masonry layout grid filling.</div><div class="translation"></div>',
          alt: 'MODAL_07',
          width: 1600,
          height: 900,
        },
      ],
    }),
    [],
  );

  return (
    <div className="min-h-screen bg-background p-10 font-mono">
      <header className="mb-10 border-b-8 border-border pb-4">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter">MVDetailsModal_Lightbox_Debug</h1>
        <p className="mt-2 font-bold opacity-50 uppercase">Current_Provider: {provider.toUpperCase()}</p>
      </header>

      <div className="flex flex-wrap gap-4">
        <button
          className="px-4 py-2 border-4 border-black bg-card shadow-shadow font-black uppercase tracking-tighter"
          onClick={() => setOpen(true)}
        >
          Open_Modal
        </button>

        <button
          className="px-4 py-2 border-4 border-black bg-ztmy-green text-black shadow-shadow font-black uppercase tracking-tighter"
          onClick={() => {
            setLightboxProvider('fb');
            window.location.reload();
          }}
        >
          Use_Fancybox
        </button>

        <button
          className="px-4 py-2 border-4 border-black bg-main text-black shadow-shadow font-black uppercase tracking-tighter"
          onClick={() => {
            setLightboxProvider('lg');
            window.location.reload();
          }}
        >
          Use_LightGallery
        </button>
      </div>

      <MVDetailsModal mv={open ? mv : null} onClose={() => setOpen(false)} />
    </div>
  );
}

