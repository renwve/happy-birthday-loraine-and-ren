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
  kind:
    | 'star'
    | 'heart'
    | 'swirl';

  index: number;
}) {
  const color =
    PALETTE[
      index % PALETTE.length
    ];

  if (kind === 'star') {
    return (
      <Star fill={color} />
    );
  }

  if (kind === 'heart') {
    return (
      <Heart fill={color} />
    );
  }

  return (
    <Swirl color={color} />
  );
}

export default function BirthdayWall() {
  const [
    attendee,
    setAttendee,
  ] =
    useState<string | null>(
      null
    );

  const [
    photos,
    setPhotos,
  ] =
    useState<MediaItem[]>([]);

  const [
    open,
    setOpen,
  ] =
    useState(false);

  const [
    files,
    setFiles,
  ] =
    useState<File[]>([]);

  const [
    previews,
    setPreviews,
  ] =
    useState<string[]>([]);

  const [
    caption,
    setCaption,
  ] =
    useState('');

  const [
    message,
    setMessage,
  ] =
    useState('');

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    toast,
    setToast,
  ] =
    useState('');

  /*
   * Which guest/category is open.
   */
  const [
    selectedGuest,
    setSelectedGuest,
  ] =
    useState<string | null>(
      null
    );

  /*
   * Which album is open.
   */
  const [
    selectedAlbum,
    setSelectedAlbum,
  ] =
    useState<Album | null>(
      null
    );

  /*
   * Which image/video is showing.
   */
  const [
    viewerIndex,
    setViewerIndex,
  ] =
    useState(0);

  async function load() {
    try {
      const response =
        await fetch(
          '/api/photos',
          {
            cache: 'no-store',
          }
        );

      const json =
        await response.json();

      if (response.ok) {
        setAttendee(
          json.attendee
        );

        setPhotos(
          json.photos || []
        );
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

    const interval =
      setInterval(
        load,
        5000
      );

    return () =>
      clearInterval(
        interval
      );
  }, []);

  useEffect(() => {
    return () => {
      previews.forEach(
        (preview) =>
          URL.revokeObjectURL(
            preview
          )
      );
    };
  }, [previews]);

  /*
   * Group media by guest.
   */
  const mediaByGuest =
    useMemo(() => {
      const grouped: Record<
        string,
        MediaItem[]
      > = {};

      for (
        const item of photos
      ) {
        const guest =
          item.from ||
          'unknown guest';

        if (!grouped[guest]) {
          grouped[guest] =
            [];
        }

        grouped[guest].push(
          item
        );
      }

      return grouped;
    }, [photos]);

  const attendeeSections =
    useMemo(() => {
      const configured =
        ATTENDEES.filter(
          (name) =>
            mediaByGuest[
              name
            ]?.length
        );

      const unknown =
        Object.keys(
          mediaByGuest
        ).filter(
          (name) =>
            !ATTENDEES.some(
              (guest) =>
                guest === name
            )
        );

      return [
        ...configured,
        ...unknown,
      ];
    }, [
      mediaByGuest,
    ]);

  /*
   * Turn a guest's media into albums.
   */
  function getAlbums(
    guest: string
  ): Album[] {
    const items =
      mediaByGuest[
        guest
      ] || [];

    const grouped:
      Record<
        string,
        MediaItem[]
      > = {};

    for (
      const item of items
    ) {
      const albumId =
        item.albumId ||
        `legacy-${item.id}`;

      if (!grouped[albumId]) {
        grouped[albumId] =
          [];
      }

      grouped[albumId].push(
        item
      );
    }

    return Object.entries(
      grouped
    )
      .map(
        ([
          id,
          albumItems,
        ]) => ({
          id,
          guest,
          items: albumItems,
          caption:
            albumItems[0]
              ?.caption ||
            null,
          createdAt:
            albumItems
              .map(
                (item) =>
                  item.createdAt
              )
              .sort()
              .at(0) ||
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

  async function choose(
    name: string
  ) {
    setMessage('');

    try {
      const response =
        await fetch(
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
          .catch(
            () => ({})
          );

      if (!response.ok) {
        setMessage(
          json.error ||
            'Could not choose attendee. Please try again.'
        );
        return;
      }

      setAttendee(
        json.attendee ||
          name
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

    previews.forEach(
      (preview) =>
        URL.revokeObjectURL(
          preview
        )
    );

    setPreviews([]);
  }

  function pick(
    selectedFiles: FileList | null
  ) {
    if (!selectedFiles)
      return;

    const incoming =
      Array.from(
        selectedFiles
      );

    if (
      incoming.length ===
      0
    ) {
      return;
    }

    /*
     * Keep the server-side 200-item
     * safety limit.
     */
    if (
      incoming.length >
      200
    ) {
      setMessage(
        'You can choose up to 200 photos or videos at once.'
      );
      return;
    }

    for (
      const file of incoming
    ) {
      const isImage =
        file.type.startsWith(
          'image/'
        );

      const isVideo =
        file.type.startsWith(
          'video/'
        );

      if (
        !isImage &&
        !isVideo
      ) {
        setMessage(
          `"${file.name}" is not a photo or video.`
        );
        return;
      }

      if (
        isImage &&
        file.size >
          15 *
            1024 *
            1024
      ) {
        setMessage(
          `"${file.name}" is too large. Keep photos under 15 MB.`
        );
        return;
      }

      if (
        isVideo &&
        file.size >
          200 *
            1024 *
            1024
      ) {
        setMessage(
          `"${file.name}" is too large. Keep videos under 200 MB.`
        );
        return;
      }
    }

    previews.forEach(
      (preview) =>
        URL.revokeObjectURL(
          preview
        )
    );

    setFiles(
      incoming
    );

    setPreviews(
      incoming.map(
        (file) =>
          URL.createObjectURL(
            file
          )
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
        (_, i) =>
          i !== index
      )
    );

    setPreviews(
      previews.filter(
        (_, i) =>
          i !== index
      )
    );
  }

  async function upload() {
    if (
      files.length ===
      0
    ) {
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

      files.forEach(
        (file) =>
          form.append(
            'files',
            file
          )
      );

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
          .catch(
            () => ({})
          );

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
        () =>
          setToast(''),
        2500
      );
    } catch (
      error
    ) {
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
        .catch(
          () => ({})
        );

    if (!response.ok) {
      setToast(
        json.error ||
          'Could not remove it'
      );

      setTimeout(
        () =>
          setToast(''),
        2500
      );

      return;
    }

    setToast(
      'taken down'
    );

    await load();

    setTimeout(
      () =>
        setToast(''),
      2500
    );
  }

  /*
   * Open guest.
   */
  function openGuest(
    guest: string
  ) {
    setSelectedGuest(
      guest
    );
  }

  /*
   * Open album viewer.
   */
  function openAlbum(
    album: Album
  ) {
    setSelectedAlbum(
      album
    );

    setViewerIndex(0);
  }

  function closeViewer() {
    setSelectedAlbum(
      null
    );

    setViewerIndex(0);
  }

  function nextItem() {
    if (
      !selectedAlbum
    ) {
      return;
    }

    setViewerIndex(
      (current) =>
        (
          current + 1
        ) %
        selectedAlbum.items
          .length
    );
  }

  function previousItem() {
    if (
      !selectedAlbum
    ) {
      return;
    }

    setViewerIndex(
      (current) =>
        (
          current -
            1 +
            selectedAlbum
              .items
              .length
        ) %
        selectedAlbum.items
          .length
    );
  }

  /*
   * Keyboard navigation.
   */
  useEffect(() => {
    if (
      !selectedAlbum
    ) {
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
    selectedAlbum
      ?.items[
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
              pick your little corner of the wall
            </p>

            <div className="attendee-grid">
              {ATTENDEES.map(
                (name) => (
                  <button
                    key={name}
                    className="attendee-button"
                    onClick={() =>
                      choose(
                        name
                      )
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
                  index={
                    index
                  }
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
            {photos.length ===
            1
              ? '1 memory so far'
              : `${photos.length} memories so far`}
          </p>
        </div>

        {photos.length ===
        0 ? (
          <div className="empty">
            <span className="stitch">
              nothing up yet
            </span>

            <p>
              Be the first one to pin a picture up.
            </p>
          </div>
        ) : (
          <div className="guest-sections">
            {attendeeSections.map(
              (
                guest,
                sectionIndex
              ) => {
                const guestMedia =
                  mediaByGuest[
                    guest
                  ] || [];

                const albums =
                  getAlbums(
                    guest
                  );

                return (
                  <section
                    className="guest-section"
                    key={guest}
                  >
                    <button
                      type="button"
                      className="guest-heading guest-heading-button"
                      onClick={() =>
                        openGuest(
                          guest
                        )
                      }
                    >
                      <span className="guest-decoration">
                        <Heart
                          fill={
                            PALETTE[
                              sectionIndex %
                                PALETTE.length
                            ]
                          }
                        />
                      </span>

                      <div>
                        <p className="guest-small">
                          memories from
                        </p>

                        <h3 className="stitch">
                          {guest}
                        </h3>
                      </div>

                      <span className="guest-count">
                        {guestMedia.length}{' '}
                        {guestMedia.length ===
                        1
                          ? 'memory'
                          : 'memories'}
                        {' '}· tap to peek
                      </span>
                    </button>
                  </section>
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
       * GUEST ALBUMS
       */}
      {selectedGuest && (
        <div
          className="album-veil on"
          onClick={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedGuest(
                null
              );
            }
          }}
        >
          <div className="album-sheet">
            <button
              type="button"
              className="album-close"
              onClick={() =>
                setSelectedGuest(
                  null
                )
              }
            >
              ×
            </button>

            <p className="guest-small">
              memories from
            </p>

            <h2 className="stitch">
              {selectedGuest}
            </h2>

            <p className="album-intro">
              little bundles of memories,
              exactly as they were uploaded ♡
            </p>

            <div className="album-grid">
              {getAlbums(
                selectedGuest
              ).map(
                (
                  album,
                  index
                ) => {
                  const first =
                    album.items[0];

                  return (
                    <button
                      type="button"
                      key={album.id}
                      className={`album-card album-tilt-${
                        index %
                        4
                      }`}
                      onClick={() =>
                        openAlbum(
                          album
                        )
                      }
                    >
                      <div className="album-polaroid">
                        <div className="album-image">
                          {first.mediaType ===
                          'video' ? (
                            <div className="album-video-thumb">
                              <video
                                src={
                                  first.driveUrl
                                }
                                muted
                                playsInline
                                preload="metadata"
                              />

                              <span className="video-badge">
                                ▶ video
                              </span>
                            </div>
                          ) : (
                            <img
                              src={`https://drive.google.com/thumbnail?id=${encodeURIComponent(
                                first.driveFileId
                              )}&sz=w1200`}
                              alt={
                                first.caption ||
                                'Album'
                              }
                            />
                          )}
                        </div>

                        <div className="album-writing">
                          <strong>
                            album{' '}
                            {index + 1}
                          </strong>

                          <span>
                            {album.items.length}{' '}
                            {album.items.length ===
                            1
                              ? 'memory'
                              : 'memories'}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </div>
      )}

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
              aria-label="Previous"
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
                      src={`https://drive.google.com/thumbnail?id=${encodeURIComponent(
                        currentItem.driveFileId
                      )}&sz=w1600`}
                      alt={
                        currentItem.caption ||
                        'Memory'
                      }
                    />
                  )}
                </div>

                <div className="viewer-caption">
                  {currentItem.caption ? (
                    <p>
                      {currentItem.caption}
                    </p>
                  ) : (
                    <p>
                      {selectedAlbum.guest}'s
                      little memory ♡
                    </p>
                  )}

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
              onClick={
                nextItem
              }
              aria-label="Next"
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
                    files.length ===
                    1
                      ? 'memory'
                      : 'memories'
                  } picked`
                : 'photos up to 15 MB · videos up to 200 MB'}
            </small>

            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(
                event
              ) => {
                pick(
                  event.target
                    .files
                );

                event.currentTarget.value =
                  '';
              }}
            />
          </label>

          {previews.length >
            0 && (
            <div className="preview-grid">
              {previews.map(
                (
                  preview,
                  index
                ) => {
                  const file =
                    files[
                      index
                    ];

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
                          src={
                            preview
                          }
                          muted
                          playsInline
                          controls
                        />
                      ) : (
                        <img
                          src={
                            preview
                          }
                          alt={`Selected memory ${
                            index +
                            1
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
            onChange={(
              event
            ) =>
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
              disabled={
                busy
              }
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
              onClick={
                upload
              }
            >
              {busy
                ? `putting up ${files.length}…`
                : files.length >
                    1
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
          toast
            ? 'on'
            : ''
        }`}
      >
        {toast}
      </div>
    </>
  );
}