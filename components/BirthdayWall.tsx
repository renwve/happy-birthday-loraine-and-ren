'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { ATTENDEES } from '@/lib/attendees';

type MediaItem = {
  id: string;
  albumId: string | null;

  caption: string | null;

  originalName: string;

  mimeType: string;
  mediaType: 'image' | 'video';

  driveFileId: string;
  driveUrl: string;

  createdAt: string;

  attendeeId: string;
  from: string | null;
};

type Album = {
  id: string;
  guest: string;
  items: MediaItem[];
  caption: string | null;
  createdAt: string;
};

const PALETTE = [
  '#36539a',
  '#addae8',
  '#c6a97c',
  '#243e8b',
];

function Star({
  fill,
}: {
  fill: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <path
        d="M50 4 L61 37 L96 37 L67 58 L78 92 L50 71 L22 92 L33 58 L4 37 L39 37 Z"
        fill={fill}
        stroke="#f4f2e0"
        strokeWidth="7"
        strokeLinejoin="round"
      />

      <path
        d="M50 4 L61 37 L96 37 L67 58 L78 92 L50 71 L22 92 L33 58 L4 37 L39 37 Z"
        fill="none"
        stroke="#243e8b"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Heart({
  fill,
}: {
  fill: string;
}) {
  return (
    <svg
      viewBox="0 0 100 90"
      aria-hidden="true"
    >
      <path
        d="M50 86 C10 58 2 34 16 18 C28 4 46 8 50 26 C54 8 72 4 84 18 C98 34 90 58 50 86 Z"
        fill={fill}
        stroke="#f4f2e0"
        strokeWidth="7"
        strokeLinejoin="round"
      />

      <path
        d="M50 86 C10 58 2 34 16 18 C28 4 46 8 50 26 C54 8 72 4 84 18 C98 34 90 58 50 86 Z"
        fill="none"
        stroke="#243e8b"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Swirl({
  color,
}: {
  color: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <path
        d="M12 88 C4 58 16 24 46 14 C68 7 86 18 84 34 C82 47 68 53 58 47 C50 42 50 30 60 27"
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
      />

      <path
        d="M12 88 C4 58 16 24 46 14 C68 7 86 18 84 34 C82 47 68 53 58 47 C50 42 50 30 60 27"
        fill="none"
        stroke="#f4f2e0"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Motif({
  kind,
  index,
}: {
  kind: 'star' | 'heart' | 'swirl';
  index: number;
}) {
  const color =
    PALETTE[index % PALETTE.length];

  if (kind === 'star') {
    return <Star fill={color} />;
  }

  if (kind === 'heart') {
    return <Heart fill={color} />;
  }

  return <Swirl color={color} />;
}

function driveThumbnail(
  fileId: string,
  size = 1200
) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(
    fileId
  )}&sz=w${size}`;
}

export default function BirthdayWall() {
  const [attendee, setAttendee] =
    useState<string | null>(null);

  const [photos, setPhotos] =
    useState<MediaItem[]>([]);

  const [open, setOpen] =
    useState(false);

  const [files, setFiles] =
    useState<File[]>([]);

  const [previews, setPreviews] =
    useState<string[]>([]);

  const [caption, setCaption] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  const [toast, setToast] =
    useState('');

  /*
   * Which category is selected.
   *
   * null = ALL
   * otherwise = attendee name
   */
  const [selectedCategory, setSelectedCategory] =
    useState<string | null>(null);

  /*
   * Album currently open in the large viewer.
   */
  const [selectedAlbum, setSelectedAlbum] =
    useState<Album | null>(null);

  /*
   * Current item in the large viewer.
   */
  const [viewerIndex, setViewerIndex] =
    useState(0);

  /*
   * Current item being previewed while
   * hovering over an album card.
   *
   * album id -> item index
   */
  const [albumHoverIndexes, setAlbumHoverIndexes] =
    useState<Record<string, number>>({});

  async function load() {
    try {
      const response = await fetch(
        '/api/photos',
        {
          cache: 'no-store',
        }
      );

      const json = await response.json();

      if (response.ok) {
        setAttendee(json.attendee);
        setPhotos(json.photos || []);
      } else {
        setMessage(
          json.error ||
            'Could not load the wall.'
        );
      }
    } catch {
      setMessage(
        'The wall is not reachable right now.'
      );
    }
  }

  useEffect(() => {
    load();

    const interval = setInterval(
      load,
      5000
    );

    return () =>
      clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      previews.forEach((preview) =>
        URL.revokeObjectURL(preview)
      );
    };
  }, [previews]);

  /*
   * Group media by attendee.
   */
  const mediaByGuest = useMemo(() => {
    const grouped: Record<
      string,
      MediaItem[]
    > = {};

    for (const item of photos) {
      const guest =
        item.from || 'unknown guest';

      if (!grouped[guest]) {
        grouped[guest] = [];
      }

      grouped[guest].push(item);
    }

    return grouped;
  }, [photos]);

  /*
   * Only attendees that actually have media
   * are displayed as category buttons.
   */
  const availableAttendees = useMemo(() => {
    const configured =
      ATTENDEES.filter(
        (name) =>
          mediaByGuest[name]?.length
      );

    const unknown =
      Object.keys(mediaByGuest).filter(
        (name) =>
          !ATTENDEES.some(
            (guest) => guest === name
          )
      );

    return [
      ...configured,
      ...unknown,
    ];
  }, [mediaByGuest]);

  /*
   * Convert one attendee's uploaded media
   * into actual albums.
   *
   * IMPORTANT:
   * There is deliberately NO fallback that creates
   * an album from unrelated media.
   *
   * Every album must have an albumId supplied by
   * the upload API.
   */
  function getAlbums(
    guest: string
  ): Album[] {
    const items =
      mediaByGuest[guest] || [];

    const grouped: Record<
      string,
      MediaItem[]
    > = {};

    for (const item of items) {
      if (!item.albumId) {
        continue;
      }

      if (!grouped[item.albumId]) {
        grouped[item.albumId] = [];
      }

      grouped[item.albumId].push(item);
    }

    return Object.entries(grouped)
      .map(
        ([id, albumItems]) => ({
          id,
          guest,
          items: albumItems,
          caption:
            albumItems[0]?.caption ||
            null,
          createdAt:
            albumItems
              .map(
                (item) =>
                  item.createdAt
              )
              .sort()[0] ||
            new Date().toISOString(),
        })
      )
      .sort(
        (a, b) =>
          new Date(
            b.createdAt
          ).getTime() -
          new Date(
            a.createdAt
          ).getTime()
      );
  }

  /*
   * ALL albums.
   *
   * Each album still belongs to the guest who
   * originally uploaded it.
   */
  const allAlbums = useMemo(() => {
    const albums: Album[] = [];

    for (const guest of availableAttendees) {
      albums.push(
        ...getAlbums(guest)
      );
    }

    return albums.sort(
      (a, b) =>
        new Date(
          b.createdAt
        ).getTime() -
        new Date(
          a.createdAt
        ).getTime()
    );
  }, [
    availableAttendees,
    mediaByGuest,
  ]);

  /*
   * Albums shown by the currently selected category.
   */
  const visibleAlbums = useMemo(() => {
    if (!selectedCategory) {
      return allAlbums;
    }

    return getAlbums(
      selectedCategory
    );
  }, [
    selectedCategory,
    allAlbums,
    mediaByGuest,
  ]);

  async function choose(
    name: string
  ) {
    setMessage('');

    try {
      const response = await fetch(
        '/api/attendee/select',
        {
          method: 'POST',
          headers: {
            'content-type':
              'application/json',
          },
          body: JSON.stringify({
            name,
          }),
        }
      );

      const json =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        setMessage(
          json.error ||
            'Could not choose attendee. Please try again.'
        );

        return;
      }

      setAttendee(
        json.attendee || name
      );

      await load();
    } catch {
      setMessage(
        'Could not choose your guest. Please try again.'
      );
    }
  }

  function resetModal() {
    setOpen(false);

    setFiles([]);

    setCaption('');

    setMessage('');

    previews.forEach((preview) =>
      URL.revokeObjectURL(preview)
    );

    setPreviews([]);
  }

  function pick(
    selectedFiles: FileList | null
  ) {
    if (!selectedFiles) {
      return;
    }

    const incoming =
      Array.from(selectedFiles);

    if (incoming.length === 0) {
      return;
    }

    if (incoming.length > 200) {
      setMessage(
        'You can choose up to 200 photos or videos at once.'
      );

      return;
    }

    for (const file of incoming) {
      const isImage =
        file.type.startsWith(
          'image/'
        );

      const isVideo =
        file.type.startsWith(
          'video/'
        );

      if (!isImage && !isVideo) {
        setMessage(
          `"${file.name}" is not a photo or video.`
        );

        return;
      }

      if (
        isImage &&
        file.size >
          15 * 1024 * 1024
      ) {
        setMessage(
          `"${file.name}" is too large. Keep photos under 15 MB.`
        );

        return;
      }

      if (
        isVideo &&
        file.size >
          200 * 1024 * 1024
      ) {
        setMessage(
          `"${file.name}" is too large. Keep videos under 200 MB.`
        );

        return;
      }
    }

    previews.forEach((preview) =>
      URL.revokeObjectURL(preview)
    );

    setFiles(incoming);

    setPreviews(
      incoming.map((file) =>
        URL.createObjectURL(file)
      )
    );

    setMessage('');
  }

  function removeSelected(
    index: number
  ) {
    const removed =
      previews[index];

    if (removed) {
      URL.revokeObjectURL(
        removed
      );
    }

    setFiles(
      files.filter(
        (_, i) => i !== index
      )
    );

    setPreviews(
      previews.filter(
        (_, i) => i !== index
      )
    );
  }

  async function upload() {
    if (files.length === 0) {
      setMessage(
        'Choose at least one photo or video first.'
      );

      return;
    }

    if (!attendee) {
      setMessage(
        'Choose an attendee first.'
      );

      return;
    }

    setBusy(true);

    setMessage(
      `Putting up ${files.length} ${
        files.length === 1
          ? 'memory'
          : 'memories'
      }…`
    );

    try {
      const form =
        new FormData();

      /*
       * IMPORTANT:
       * All selected files are sent in ONE request.
       *
       * The server creates ONE album for this
       * entire upload.
       */
      files.forEach((file) => {
        form.append(
          'files',
          file
        );
      });

      form.append(
        'caption',
        caption
      );

      const response =
        await fetch(
          '/api/upload',
          {
            method: 'POST',
            body: form,
          }
        );

      const json =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          json.error ||
            'Upload failed.'
        );
      }

      resetModal();

      setToast(
        json.count === 1
          ? 'it is up ♡'
          : `${json.count} memories are up ♡`
      );

      await load();

      setTimeout(
        () => setToast(''),
        2500
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'That did not save. Try once more.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(
    id: string
  ) {
    if (
      !confirm(
        'Take this memory off the wall for everyone?'
      )
    ) {
      return;
    }

    const response =
      await fetch(
        '/api/delete',
        {
          method: 'POST',
          headers: {
            'content-type':
              'application/json',
          },
          body: JSON.stringify({
            id,
          }),
        }
      );

    const json =
      await response
        .json()
        .catch(() => ({}));

    if (!response.ok) {
      setToast(
        json.error ||
          'Could not remove it'
      );

      setTimeout(
        () => setToast(''),
        2500
      );

      return;
    }

    setToast('taken down');

    await load();

    setTimeout(
      () => setToast(''),
      2500
    );
  }

  /*
   * Album hover navigation.
   */
  function albumPreviewNext(
    album: Album
  ) {
    setAlbumHoverIndexes(
      (current) => ({
        ...current,
        [album.id]:
          ((current[album.id] || 0) +
            1) %
          album.items.length,
      })
    );
  }

  function albumPreviewPrevious(
    album: Album
  ) {
    setAlbumHoverIndexes(
      (current) => ({
        ...current,
        [album.id]:
          ((current[album.id] || 0) -
            1 +
            album.items.length) %
          album.items.length,
      })
    );
  }

  /*
   * Open album viewer.
   */
  function openAlbum(
    album: Album
  ) {
    setSelectedAlbum(album);
    setViewerIndex(0);
  }

  function closeViewer() {
    setSelectedAlbum(null);
    setViewerIndex(0);
  }

  function nextItem() {
    if (!selectedAlbum) {
      return;
    }

    setViewerIndex(
      (current) =>
        (current + 1) %
        selectedAlbum.items.length
    );
  }

  function previousItem() {
    if (!selectedAlbum) {
      return;
    }

    setViewerIndex(
      (current) =>
        (current -
          1 +
          selectedAlbum.items.length) %
        selectedAlbum.items.length
    );
  }

  /*
   * Keyboard navigation for album viewer.
   */
  useEffect(() => {
    if (!selectedAlbum) {
      return;
    }

    function handleKey(
      event: KeyboardEvent
    ) {
      if (
        event.key ===
        'ArrowRight'
      ) {
        nextItem();
      }

      if (
        event.key ===
        'ArrowLeft'
      ) {
        previousItem();
      }

      if (
        event.key ===
        'Escape'
      ) {
        closeViewer();
      }
    }

    window.addEventListener(
      'keydown',
      handleKey
    );

    return () =>
      window.removeEventListener(
        'keydown',
        handleKey
      );
  });

  const currentItem =
    selectedAlbum?.items[
      viewerIndex
    ];

  return (
    <>
      {!attendee && (
        <div className="attendee-veil">
          <div className="attendee-sheet">
            <span className="badge">
              <Motif
                kind="star"
                index={0}
              />{' '}
              a whole wall just for them
            </span>

            <h2>
              who are you?
            </h2>

            <p>
              pick your little corner of
              the wall
            </p>

            <div className="attendee-grid">
              {ATTENDEES.map(
                (name) => (
                  <button
                    key={name}
                    className="attendee-button"
                    onClick={() =>
                      choose(name)
                    }
                  >
                    {name}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      <div className="sky">
        <div className="dotgrid" />

        <div className="stickerfield">
          {(
            [
              'star',
              'heart',
              'swirl',
              'star',
              'heart',
              'swirl',
            ] as const
          ).map(
            (
              motif,
              index
            ) => (
              <div
                key={index}
                className={`sticker s${
                  index + 1
                }`}
              >
                <Motif
                  kind={motif}
                  index={index}
                />
              </div>
            )
          )}

          <div className="hero">
            <span className="badge">
              <Motif
                kind="star"
                index={0}
              />{' '}
              a whole wall just for them
            </span>

            <div className="hb-wrap">
              <svg
                className="hb-us"
                viewBox="0 0 300 200"
                aria-hidden="true"
              >
                <path
                  d="M40 170 C10 120 30 60 90 40 C150 20 210 30 250 70"
                  fill="none"
                  stroke="var(--tan)"
                  strokeWidth="2.4"
                  strokeDasharray="1 11"
                  strokeLinecap="round"
                />
              </svg>

              <h1 className="hb1 stitch">
                happy
              </h1>

              <h1 className="hb2 stitch">
                birthday
              </h1>
            </div>

            <div className="to-names">
              <span className="to-tag">
                to the one and only
              </span>

              <p className="names">
                Loraine{' '}
                <span className="amp">
                  &amp;
                </span>{' '}
                Ren
              </p>
            </div>

            <div className="tape-row">
              <span className="tape">
                pin it up ↓
              </span>

              <span className="tape">
                bring a picture, any picture
              </span>

              <span className="tape">
                the goofier the better
              </span>
            </div>

            <div className="cta-zone">
              <button
                type="button"
                className="cta"
                onClick={() => {
                  if (!attendee) {
                    setMessage(
                      'Choose an attendee first.'
                    );

                    return;
                  }

                  setMessage('');
                  setOpen(true);
                }}
              >
                + add a photo or video
              </button>

              <span className="cta-note">
                {attendee
                  ? `you are ${attendee} · anyone can add`
                  : 'choose an attendee above'}
              </span>
            </div>
          </div>
        </div>

        <div className="scallop-bottom" />
      </div>

      <main className="wall">
        <div className="wallhead">
          <h2 className="stitch">
            the wall
          </h2>

          <svg
            className="squig"
            viewBox="0 0 160 20"
            aria-hidden="true"
          >
            <path
              d="M2 10 Q20 0 38 10 T74 10 T110 10 T146 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>

          <p className="count">
            {photos.length === 1
              ? '1 memory so far'
              : `${photos.length} memories so far`}
          </p>
        </div>

        {/*
         * CATEGORY BAR
         *
         * This sits directly underneath "the wall".
         *
         * It scrolls horizontally on small screens.
         */}
        <div className="category-wrap">
          <div
            className="category-scroll"
            role="tablist"
            aria-label="Memory categories"
          >
            <button
              type="button"
              role="tab"
              aria-selected={
                selectedCategory === null
              }
              className={`category-pill ${
                selectedCategory === null
                  ? 'active'
                  : ''
              }`}
              onClick={() =>
                setSelectedCategory(null)
              }
            >
              <span className="category-dot">
                ✦
              </span>

              ALL photos + videos
            </button>

            {availableAttendees.map(
              (name, index) => (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  aria-selected={
                    selectedCategory ===
                    name
                  }
                  className={`category-pill ${
                    selectedCategory ===
                    name
                      ? 'active'
                      : ''
                  }`}
                  onClick={() =>
                    setSelectedCategory(
                      name
                    )
                  }
                >
                  <span className="category-dot">
                    {index % 2 === 0
                      ? '♡'
                      : '✦'}
                  </span>

                  {name}
                </button>
              )
            )}
          </div>
        </div>

        {photos.length === 0 ? (
          <div className="empty">
            <span className="stitch">
              nothing up yet
            </span>

            <p>
              Be the first one to pin a
              picture up.
            </p>
          </div>
        ) : visibleAlbums.length ===
          0 ? (
          <div className="empty">
            <span className="stitch">
              no albums here yet
            </span>

            <p>
              This little corner of the
              wall is waiting for memories.
            </p>
          </div>
        ) : (
          <div className="album-wall">
            {visibleAlbums.map(
              (album, albumIndex) => {
                const previewIndex =
                  albumHoverIndexes[
                    album.id
                  ] || 0;

                const previewItem =
                  album.items[
                    previewIndex
                  ];

                const secondItem =
                  album.items[1];

                const thirdItem =
                  album.items[2];

                return (
                  <article
                    key={album.id}
                    className={`album-stack album-stack-${
                      albumIndex % 5
                    }`}
                    onMouseEnter={() => {
                      setAlbumHoverIndexes(
                        (current) => ({
                          ...current,
                          [album.id]:
                            current[
                              album.id
                            ] || 0,
                        })
                      );
                    }}
                  >
                    <div className="polaroid-back back-one">
                      {thirdItem &&
                      thirdItem.mediaType ===
                        'image' ? (
                        <img
                          src={driveThumbnail(
                            thirdItem.driveFileId,
                            700
                          )}
                          alt=""
                        />
                      ) : null}
                    </div>

                    <div className="polaroid-back back-two">
                      {secondItem &&
                      secondItem.mediaType ===
                        'image' ? (
                        <img
                          src={driveThumbnail(
                            secondItem.driveFileId,
                            700
                          )}
                          alt=""
                        />
                      ) : null}
                    </div>

                    <button
                      type="button"
                      className="album-main"
                      onClick={() =>
                        openAlbum(album)
                      }
                    >
                      <div className="album-photo">
                        {previewItem.mediaType ===
                        'video' ? (
                          <div className="album-video">
                            <div className="video-symbol">
                              ▶
                            </div>

                            <span>
                              video
                            </span>
                          </div>
                        ) : (
                          <img
                            src={driveThumbnail(
                              previewItem.driveFileId,
                              1200
                            )}
                            alt={
                              previewItem.caption ||
                              `${album.guest}'s memory`
                            }
                          />
                        )}

                        <div className="album-hover">
                          <span className="album-hover-label">
                            peek through
                          </span>

                          <div className="album-hover-arrows">
                            <button
                              type="button"
                              className="mini-arrow"
                              aria-label="Previous memory"
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                albumPreviewPrevious(
                                  album
                                );
                              }}
                            >
                              ‹
                            </button>

                            <span>
                              {previewIndex +
                                1}{' '}
                              /{' '}
                              {
                                album
                                  .items
                                  .length
                              }
                            </span>

                            <button
                              type="button"
                              className="mini-arrow"
                              aria-label="Next memory"
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                albumPreviewNext(
                                  album
                                );
                              }}
                            >
                              ›
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="polaroid-bottom">
                        <div>
                          <strong>
                            {album.guest}
                          </strong>

                          <span>
                            {album.items.length}{' '}
                            {album.items.length ===
                            1
                              ? 'memory'
                              : 'memories'}
                          </span>
                        </div>

                        <span className="album-arrow">
                          →
                        </span>
                      </div>
                    </button>
                  </article>
                );
              }
            )}
          </div>
        )}
      </main>

      <footer className="foot">
        <span className="foot-tape">
          made for loraine &amp; ren
        </span>

        <p className="row2">
          keep the memories coming all week ♡
        </p>
      </footer>

      {/*
       * ALBUM VIEWER
       */}
      {selectedAlbum &&
        currentItem && (
          <div className="viewer-veil">
            <button
              type="button"
              className="viewer-close"
              onClick={
                closeViewer
              }
              aria-label="Close album"
            >
              ×
            </button>

            <button
              type="button"
              className="viewer-arrow viewer-left"
              onClick={
                previousItem
              }
              aria-label="Previous memory"
            >
              ‹
            </button>

            <div className="viewer-content">
              <div className="viewer-polaroid">
                <div className="viewer-media">
                  {currentItem.mediaType ===
                  'video' ? (
                    <iframe
                      src={`https://drive.google.com/file/d/${encodeURIComponent(
                        currentItem.driveFileId
                      )}/preview`}
                      title={
                        currentItem.originalName
                      }
                      allow="autoplay; fullscreen"
                      allowFullScreen
                    />
                  ) : (
                    <img
                      src={driveThumbnail(
                        currentItem.driveFileId,
                        1600
                      )}
                      alt={
                        currentItem.caption ||
                        'Memory'
                      }
                    />
                  )}
                </div>

                <div className="viewer-caption">
                  <div>
                    {currentItem.caption ? (
                      <p>
                        {
                          currentItem.caption
                        }
                      </p>
                    ) : (
                      <p>
                        {
                          selectedAlbum.guest
                        }
                        's little memory ♡
                      </p>
                    )}
                  </div>

                  <span>
                    {viewerIndex + 1} /{' '}
                    {
                      selectedAlbum
                        .items.length
                    }
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="viewer-arrow viewer-right"
              onClick={nextItem}
              aria-label="Next memory"
            >
              ›
            </button>

            <div className="viewer-bottom">
              <span>
                {selectedAlbum.guest}
              </span>

              {currentItem.mediaType ===
                'video' && (
                <span>
                  🎥 video
                </span>
              )}
            </div>
          </div>
        )}

      {/*
       * ADD MEDIA MODAL
       */}
      <div
        className={`veil ${
          open ? 'on' : ''
        }`}
        onClick={(event) => {
          if (
            event.currentTarget ===
            event.target
          ) {
            resetModal();
          }
        }}
      >
        <div
          className="sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Add photos and videos"
        >
          <h3>
            add some memories
          </h3>

          <p className="sub">
            everything you choose here becomes
            one little album ♡
          </p>

          <label className="drop">
            <b>
              choose photos + videos
            </b>

            <small>
              {files.length > 0
                ? `${files.length} ${
                    files.length === 1
                      ? 'memory'
                      : 'memories'
                  } picked`
                : 'photos up to 15 MB · videos up to 200 MB'}
            </small>

            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(event) => {
                pick(
                  event.target.files
                );

                event.currentTarget.value =
                  '';
              }}
            />
          </label>

          {previews.length > 0 && (
            <div className="preview-grid">
              {previews.map(
                (
                  preview,
                  index
                ) => {
                  const file =
                    files[index];

                  const isVideo =
                    file?.type.startsWith(
                      'video/'
                    );

                  return (
                    <div
                      className="preview-item"
                      key={preview}
                    >
                      {isVideo ? (
                        <video
                          src={preview}
                          muted
                          playsInline
                          controls
                        />
                      ) : (
                        <img
                          src={preview}
                          alt={`Selected memory ${
                            index + 1
                          }`}
                        />
                      )}

                      <button
                        type="button"
                        className="preview-remove"
                        onClick={() =>
                          removeSelected(
                            index
                          )
                        }
                        aria-label={`Remove ${
                          index + 1
                        }`}
                      >
                        ×
                      </button>
                    </div>
                  );
                }
              )}
            </div>
          )}

          <label
            className="fld"
            htmlFor="cap"
          >
            caption, if you want one
          </label>

          <input
            id="cap"
            type="text"
            maxLength={90}
            value={caption}
            onChange={(event) =>
              setCaption(
                event.target.value
              )
            }
            placeholder="the night we lost the car keys"
          />

          <label className="fld">
            sign it
          </label>

          <input
            type="text"
            readOnly
            value={
              attendee || ''
            }
          />

          <div className="row">
            <button
              type="button"
              className="ghost"
              onClick={
                resetModal
              }
              disabled={busy}
            >
              back
            </button>

            <button
              type="button"
              className="solid"
              disabled={
                files.length ===
                  0 ||
                busy
              }
              onClick={upload}
            >
              {busy
                ? `putting up ${files.length}…`
                : files.length > 1
                  ? `put up ${files.length} memories`
                  : 'put it up'}
            </button>
          </div>

          <p className="msg">
            {message}
          </p>
        </div>
      </div>

      <div
        className={`toast ${
          toast ? 'on' : ''
        }`}
      >
        {toast}
      </div>

      <style jsx global>{`
        :root {
          --blue: #36539a;
          --light-blue: #addae8;
          --tan: #c6a97c;
          --dark-blue: #243e8b;
          --cream: #f4f2e0;
          --ink: #24345f;
          --paper: #fffdf2;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: var(--cream);
          color: var(--ink);
        }

        button,
        input {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .sky {
          position: relative;
          min-height: 730px;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 20% 20%,
              rgba(255,255,255,.35),
              transparent 24%
            ),
            linear-gradient(
              135deg,
              #addae8 0%,
              #c8e5ed 45%,
              #f4f2e0 100%
            );
        }

        .dotgrid {
          position: absolute;
          inset: 0;
          opacity: .18;
          background-image:
            radial-gradient(
              var(--blue) 1px,
              transparent 1px
            );
          background-size: 17px 17px;
        }

        .stickerfield {
          position: relative;
          min-height: 730px;
          max-width: 1250px;
          margin: 0 auto;
        }

        .hero {
          position: relative;
          z-index: 4;
          padding: 95px 24px 120px;
          text-align: center;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 14px;
          border: 1px solid var(--dark-blue);
          border-radius: 999px;
          background: rgba(255,255,255,.55);
          color: var(--dark-blue);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .badge svg {
          width: 18px;
          height: 18px;
        }

        .hb-wrap {
          position: relative;
          width: min(680px, 100%);
          margin: 30px auto 15px;
        }

        .hb-us {
          position: absolute;
          inset: -40px 0 auto;
          width: 100%;
          height: 180px;
          pointer-events: none;
        }

        .stitch {
          color: var(--dark-blue);
          font-weight: 900;
          letter-spacing: -.05em;
          text-shadow:
            2px 2px 0 var(--cream),
            4px 4px 0 rgba(54,83,154,.12);
        }

        .hb1,
        .hb2 {
          position: relative;
          margin: 0;
          font-size: clamp(72px, 12vw, 150px);
          line-height: .72;
          text-transform: lowercase;
        }

        .hb2 {
          margin-top: 22px;
          color: var(--blue);
        }

        .to-names {
          margin-top: 55px;
        }

        .to-tag {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .16em;
        }

        .names {
          margin: 7px 0 0;
          color: var(--dark-blue);
          font-size: 29px;
          font-weight: 900;
        }

        .amp {
          color: var(--tan);
        }

        .tape-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          margin: 35px auto 28px;
        }

        .tape {
          padding: 9px 18px;
          background: rgba(244,242,224,.8);
          color: var(--dark-blue);
          font-size: 12px;
          font-weight: 800;
          transform: rotate(-2deg);
          box-shadow: 0 3px 8px rgba(36,62,139,.08);
        }

        .tape:nth-child(2) {
          transform: rotate(2deg);
        }

        .tape:nth-child(3) {
          transform: rotate(-1deg);
        }

        .cta-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 9px;
        }

        .cta {
          border: 0;
          border-radius: 999px;
          padding: 16px 27px;
          background: var(--dark-blue);
          color: white;
          font-weight: 900;
          box-shadow:
            0 7px 0 rgba(36,62,139,.15),
            0 13px 30px rgba(36,62,139,.18);
          transition:
            transform .18s ease,
            box-shadow .18s ease;
        }

        .cta:hover {
          transform: translateY(-3px);
          box-shadow:
            0 10px 0 rgba(36,62,139,.12),
            0 18px 35px rgba(36,62,139,.2);
        }

        .cta-note {
          font-size: 12px;
          font-weight: 700;
          opacity: .72;
        }

        .sticker {
          position: absolute;
          z-index: 3;
          width: 55px;
          height: 55px;
        }

        .sticker svg {
          width: 100%;
          height: 100%;
        }

        .s1 {
          left: 7%;
          top: 15%;
          transform: rotate(-14deg);
        }

        .s2 {
          right: 10%;
          top: 21%;
          transform: rotate(12deg);
        }

        .s3 {
          left: 10%;
          bottom: 17%;
          transform: rotate(-12deg);
        }

        .s4 {
          right: 8%;
          bottom: 20%;
          transform: rotate(15deg);
        }

        .s5 {
          left: 22%;
          top: 8%;
          width: 35px;
          height: 35px;
        }

        .s6 {
          right: 25%;
          bottom: 12%;
          width: 40px;
          height: 40px;
        }

        .scallop-bottom {
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 35px;
          background:
            radial-gradient(
              circle at 18px -2px,
              var(--cream) 18px,
              transparent 19px
            ) 0 0 / 36px 36px repeat-x;
        }

        .wall {
          max-width: 1180px;
          margin: 0 auto;
          padding: 75px 24px 90px;
        }

        .wallhead {
          text-align: center;
        }

        .wallhead h2 {
          margin: 0;
          font-size: clamp(48px, 7vw, 78px);
        }

        .squig {
          width: 150px;
          color: var(--tan);
          margin: 8px auto;
          display: block;
        }

        .count {
          margin: 0;
          font-size: 13px;
          font-weight: 800;
          opacity: .65;
        }

        /*
         * CATEGORY BAR
         */

        .category-wrap {
          margin: 34px 0 55px;
          width: 100%;
        }

        .category-scroll {
          display: flex;
          align-items: center;
          gap: 10px;
          overflow-x: auto;
          padding: 8px 4px 15px;
          scrollbar-width: thin;
          scrollbar-color:
            var(--tan)
            transparent;
          -webkit-overflow-scrolling: touch;
        }

        .category-scroll::-webkit-scrollbar {
          height: 6px;
        }

        .category-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .category-scroll::-webkit-scrollbar-thumb {
          background: var(--tan);
          border-radius: 99px;
        }

        .category-pill {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 46px;
          padding: 10px 17px;
          border: 1.5px solid rgba(54,83,154,.28);
          border-radius: 999px;
          background: rgba(255,255,255,.55);
          color: var(--dark-blue);
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
          box-shadow:
            0 3px 0 rgba(54,83,154,.07);
          transition:
            transform .18s ease,
            background .18s ease,
            color .18s ease,
            border-color .18s ease;
        }

        .category-pill:hover {
          transform: translateY(-2px);
          background: white;
        }

        .category-pill.active {
          border-color: var(--dark-blue);
          background: var(--dark-blue);
          color: white;
          transform: translateY(-2px);
          box-shadow:
            0 5px 0 rgba(54,83,154,.15);
        }

        .category-dot {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--light-blue);
          color: var(--dark-blue);
          font-size: 12px;
        }

        .category-pill.active .category-dot {
          background: var(--tan);
          color: white;
        }

        /*
         * ALBUM WALL
         */

        .album-wall {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(225px, 1fr)
            );
          gap: 65px 48px;
          align-items: start;
          padding: 10px 20px;
        }

        .album-stack {
          position: relative;
          min-height: 320px;
          perspective: 900px;
        }

        .album-main,
        .polaroid-back {
          width: 100%;
          max-width: 285px;
          aspect-ratio: .78;
          margin: 0 auto;
        }

        .album-main {
          position: relative;
          z-index: 4;
          display: block;
          padding: 12px 12px 0;
          border: 0;
          background: var(--paper);
          box-shadow:
            0 10px 22px rgba(36,62,139,.16);
          transform:
            rotate(-2deg);
          transition:
            transform .28s ease,
            box-shadow .28s ease;
        }

        .album-stack-1 .album-main {
          transform: rotate(3deg);
        }

        .album-stack-2 .album-main {
          transform: rotate(-4deg);
        }

        .album-stack-3 .album-main {
          transform: rotate(2deg);
        }

        .album-stack-4 .album-main {
          transform: rotate(-1deg);
        }

        .album-stack:hover .album-main {
          z-index: 10;
          transform:
            rotate(0deg)
            translateY(-10px)
            scale(1.025);
          box-shadow:
            0 18px 35px rgba(36,62,139,.2);
        }

        .polaroid-back {
          position: absolute;
          left: 50%;
          top: 12px;
          z-index: 1;
          padding: 12px;
          background: #fffaf0;
          box-shadow:
            0 8px 17px rgba(36,62,139,.11);
          transform:
            translateX(-50%)
            rotate(5deg);
          pointer-events: none;
          transition:
            transform .28s ease;
        }

        .back-two {
          z-index: 2;
          transform:
            translateX(-50%)
            rotate(-6deg);
        }

        .album-stack:hover .back-one {
          transform:
            translateX(-50%)
            translate(-13px, 5px)
            rotate(10deg);
        }

        .album-stack:hover .back-two {
          transform:
            translateX(-50%)
            translate(12px, 1px)
            rotate(-10deg);
        }

        .polaroid-back img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .album-photo {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          overflow: hidden;
          background: #dcebf0;
        }

        .album-photo > img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .album-video {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background:
            linear-gradient(
              135deg,
              var(--dark-blue),
              var(--blue)
            );
          color: white;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .12em;
        }

        .video-symbol {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 55px;
          height: 55px;
          border-radius: 50%;
          background: rgba(255,255,255,.18);
          border: 2px solid rgba(255,255,255,.7);
          font-size: 19px;
          padding-left: 3px;
        }

        /*
         * Hidden until the album is hovered.
         */

        .album-hover {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 15px;
          background:
            linear-gradient(
              transparent 35%,
              rgba(36,62,139,.7)
            );
          color: white;
          opacity: 0;
          transition: opacity .2s ease;
        }

        .album-main:hover .album-hover {
          opacity: 1;
        }

        .album-hover-label {
          margin-bottom: 7px;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .14em;
          text-align: center;
        }

        .album-hover-arrows {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 11px;
          font-weight: 900;
        }

        .mini-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 31px;
          height: 31px;
          border: 1px solid rgba(255,255,255,.75);
          border-radius: 50%;
          background: rgba(255,255,255,.17);
          color: white;
          font-size: 23px;
          line-height: 1;
          transition:
            background .15s ease,
            transform .15s ease;
        }

        .mini-arrow:hover {
          background: rgba(255,255,255,.35);
          transform: scale(1.08);
        }

        .polaroid-bottom {
          min-height: 73px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 13px 7px 10px;
          color: var(--dark-blue);
          text-align: left;
        }

        .polaroid-bottom div {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .polaroid-bottom strong {
          font-size: 15px;
          font-weight: 900;
        }

        .polaroid-bottom span {
          font-size: 10px;
          font-weight: 700;
          opacity: .58;
        }

        .album-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 31px;
          height: 31px;
          border-radius: 50%;
          background: var(--light-blue);
          color: var(--dark-blue) !important;
          opacity: 1 !important;
          font-size: 17px !important;
        }

        /*
         * EMPTY STATE
         */

        .empty {
          max-width: 600px;
          margin: 60px auto;
          padding: 60px 25px;
          text-align: center;
          border: 2px dashed rgba(54,83,154,.25);
          border-radius: 28px;
          background: rgba(255,255,255,.3);
        }

        .empty .stitch {
          font-size: 36px;
        }

        .empty p {
          margin: 12px 0 0;
          font-size: 14px;
          opacity: .65;
        }

        /*
         * ATTENDEE SELECTOR
         */

        .attendee-veil {
          position: fixed;
          z-index: 500;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background:
            rgba(36,62,139,.35);
          backdrop-filter: blur(8px);
        }

        .attendee-sheet {
          width: min(600px, 100%);
          padding: 45px 35px;
          border: 4px solid var(--dark-blue);
          border-radius: 30px;
          background: var(--cream);
          text-align: center;
          box-shadow:
            0 25px 70px rgba(36,62,139,.25);
        }

        .attendee-sheet h2 {
          margin: 22px 0 5px;
          color: var(--dark-blue);
          font-size: 42px;
          font-weight: 900;
        }

        .attendee-sheet p {
          margin: 0 0 28px;
          opacity: .65;
        }

        .attendee-grid {
          display: grid;
          grid-template-columns:
            repeat(2, 1fr);
          gap: 10px;
        }

        .attendee-button {
          min-height: 52px;
          border: 2px solid var(--dark-blue);
          border-radius: 15px;
          background: white;
          color: var(--dark-blue);
          font-weight: 900;
          transition:
            transform .15s ease,
            background .15s ease;
        }

        .attendee-button:hover {
          background: var(--light-blue);
          transform: translateY(-2px) rotate(-1deg);
        }

        /*
         * ALBUM VIEWER
         */

        .viewer-veil {
          position: fixed;
          z-index: 800;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 35px 80px 75px;
          background:
            rgba(25,39,75,.84);
          backdrop-filter: blur(12px);
        }

        .viewer-content {
          width: min(760px, 80vw);
          max-height: 85vh;
        }

        .viewer-polaroid {
          max-height: 85vh;
          padding: 16px 16px 0;
          background: var(--paper);
          box-shadow:
            0 30px 70px rgba(0,0,0,.3);
          transform: rotate(-1deg);
        }

        .viewer-media {
          width: 100%;
          height: min(65vh, 650px);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #dcebf0;
        }

        .viewer-media img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .viewer-media iframe {
          width: 100%;
          height: 100%;
          border: 0;
        }

        .viewer-caption {
          min-height: 75px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 13px 5px;
          color: var(--dark-blue);
        }

        .viewer-caption p {
          margin: 0;
          font-size: 14px;
          font-weight: 800;
        }

        .viewer-caption span {
          flex: 0 0 auto;
          font-size: 11px;
          font-weight: 900;
          opacity: .55;
        }

        .viewer-close {
          position: absolute;
          top: 22px;
          right: 25px;
          width: 48px;
          height: 48px;
          border: 1px solid rgba(255,255,255,.5);
          border-radius: 50%;
          background: rgba(255,255,255,.1);
          color: white;
          font-size: 31px;
          line-height: 1;
        }

        .viewer-arrow {
          position: absolute;
          top: 50%;
          z-index: 5;
          width: 58px;
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(255,255,255,.65);
          border-radius: 50%;
          background: rgba(255,255,255,.12);
          color: white;
          font-size: 43px;
          line-height: 1;
          transform: translateY(-50%);
          transition:
            background .15s ease,
            transform .15s ease;
        }

        .viewer-arrow:hover {
          background: rgba(255,255,255,.25);
          transform:
            translateY(-50%)
            scale(1.05);
        }

        .viewer-left {
          left: 25px;
        }

        .viewer-right {
          right: 25px;
        }

        .viewer-bottom {
          position: absolute;
          bottom: 25px;
          left: 50%;
          display: flex;
          gap: 12px;
          color: white;
          font-size: 12px;
          font-weight: 900;
          transform: translateX(-50%);
        }

        /*
         * ADD MODAL
         */

        .veil {
          position: fixed;
          z-index: 700;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 25px;
          background: rgba(36,62,139,.4);
          backdrop-filter: blur(7px);
          opacity: 0;
          pointer-events: none;
          transition: opacity .2s ease;
        }

        .veil.on {
          opacity: 1;
          pointer-events: auto;
        }

        .sheet {
          width: min(680px, 100%);
          max-height: 90vh;
          overflow-y: auto;
          padding: 32px;
          border: 3px solid var(--dark-blue);
          border-radius: 25px;
          background: var(--cream);
          box-shadow:
            0 25px 70px rgba(36,62,139,.25);
        }

        .sheet h3 {
          margin: 0;
          color: var(--dark-blue);
          font-size: 31px;
          font-weight: 900;
        }

        .sub {
          margin: 7px 0 22px;
          opacity: .65;
          font-size: 13px;
        }

        .drop {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 27px 18px;
          border: 2px dashed var(--tan);
          border-radius: 18px;
          background: rgba(255,255,255,.45);
          color: var(--dark-blue);
          text-align: center;
          cursor: pointer;
        }

        .drop b {
          font-size: 16px;
        }

        .drop small {
          opacity: .6;
          font-size: 11px;
        }

        .drop input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .preview-grid {
          display: grid;
          grid-template-columns:
            repeat(4, 1fr);
          gap: 8px;
          margin: 15px 0 22px;
        }

        .preview-item {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          border-radius: 10px;
          background: var(--light-blue);
        }

        .preview-item img,
        .preview-item video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .preview-remove {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 25px;
          height: 25px;
          border: 0;
          border-radius: 50%;
          background: rgba(36,62,139,.85);
          color: white;
          font-size: 17px;
          line-height: 1;
        }

        .fld {
          display: block;
          margin: 14px 0 6px;
          color: var(--dark-blue);
          font-size: 12px;
          font-weight: 900;
        }

        .sheet input[type='text'] {
          width: 100%;
          min-height: 46px;
          padding: 10px 13px;
          border: 1.5px solid rgba(54,83,154,.25);
          border-radius: 11px;
          outline: none;
          background: white;
          color: var(--dark-blue);
        }

        .sheet input[type='text']:focus {
          border-color: var(--dark-blue);
        }

        .row {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          margin-top: 20px;
        }

        .ghost,
        .solid {
          min-height: 44px;
          padding: 10px 17px;
          border-radius: 999px;
          font-weight: 900;
        }

        .ghost {
          border: 1.5px solid var(--dark-blue);
          background: transparent;
          color: var(--dark-blue);
        }

        .solid {
          border: 1.5px solid var(--dark-blue);
          background: var(--dark-blue);
          color: white;
        }

        .solid:disabled {
          cursor: not-allowed;
          opacity: .5;
        }

        .msg {
          min-height: 20px;
          margin: 13px 0 0;
          color: var(--dark-blue);
          font-size: 12px;
          font-weight: 700;
        }

        /*
         * FOOTER
         */

        .foot {
          padding: 50px 20px 70px;
          text-align: center;
          background: #e8e3cf;
        }

        .foot-tape {
          display: inline-block;
          padding: 9px 18px;
          background: var(--cream);
          color: var(--dark-blue);
          font-size: 12px;
          font-weight: 900;
          transform: rotate(-2deg);
        }

        .row2 {
          margin: 18px 0 0;
          font-size: 12px;
          font-weight: 700;
          opacity: .6;
        }

        /*
         * TOAST
         */

        .toast {
          position: fixed;
          z-index: 1000;
          left: 50%;
          bottom: 25px;
          padding: 12px 18px;
          border-radius: 999px;
          background: var(--dark-blue);
          color: white;
          font-size: 13px;
          font-weight: 900;
          box-shadow:
            0 10px 30px rgba(36,62,139,.25);
          opacity: 0;
          pointer-events: none;
          transform:
            translate(-50%, 15px);
          transition:
            opacity .2s ease,
            transform .2s ease;
        }

        .toast.on {
          opacity: 1;
          transform:
            translate(-50%, 0);
        }

        /*
         * MOBILE
         */

        @media (max-width: 700px) {
          .sky,
          .stickerfield {
            min-height: 670px;
          }

          .hero {
            padding-top: 75px;
          }

          .hb1,
          .hb2 {
            font-size: 76px;
          }

          .sticker {
            width: 38px;
            height: 38px;
          }

          .s1 {
            left: 3%;
          }

          .s2 {
            right: 3%;
          }

          .s3 {
            left: 4%;
          }

          .s4 {
            right: 3%;
          }

          .s5,
          .s6 {
            display: none;
          }

          .wall {
            padding-left: 15px;
            padding-right: 15px;
          }

          .category-wrap {
            margin-bottom: 40px;
          }

          .category-scroll {
            margin-right: -15px;
            padding-right: 20px;
          }

          .album-wall {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 45px 20px;
            padding: 5px 5px;
          }

          .album-main,
          .polaroid-back {
            max-width: none;
          }

          .album-stack {
            min-height: 250px;
          }

          .polaroid-bottom {
            min-height: 62px;
          }

          .polaroid-bottom strong {
            font-size: 12px;
          }

          .polaroid-bottom span {
            font-size: 9px;
          }

          .viewer-veil {
            padding:
              60px 12px
              70px;
          }

          .viewer-content {
            width: 100%;
          }

          .viewer-media {
            height: 65vh;
          }

          .viewer-arrow {
            width: 42px;
            height: 42px;
            font-size: 31px;
          }

          .viewer-left {
            left: 7px;
          }

          .viewer-right {
            right: 7px;
          }

          .viewer-close {
            top: 12px;
            right: 12px;
          }

          .attendee-grid {
            grid-template-columns: 1fr;
          }

          .sheet {
            padding: 24px;
          }

          .preview-grid {
            grid-template-columns:
              repeat(3, 1fr);
          }
        }

        @media (hover: none) {
          /*
           * On touch devices there is no hover,
           * so tapping the album still opens it normally.
           */
          .album-hover {
            display: none;
          }
        }
      `}</style>
    </>
  );
}