'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { ATTENDEES } from '@/lib/attendees';

type Photo = {
  id: string;
  caption: string | null;
  driveFileId: string;
  driveUrl: string;
  createdAt: string;
  attendeeId: string;
  from: string | null;
  mimeType?: string | null;
  mediaType?: string | null;
};

const PALETTE = [
  '#36539a',
  '#addae8',
  '#c6a97c',
  '#243e8b',
];

const MAX_FILES_PER_UPLOAD = 200;

const BEIGE_NAMES = [
  'Loraine',
  'Ren',
];

const CHIP_TILTS = [
  -3,
  2,
  -1.5,
  3,
  -2.5,
  1,
  -3.5,
  2.5,
  -1,
  1.5,
];

function tiltFor(index: number) {
  return CHIP_TILTS[
    index % CHIP_TILTS.length
  ];
}

function isVideo(
  photo: Photo
) {
  return (
    photo.mediaType === 'video' ||
    photo.mimeType?.startsWith(
      'video/'
    )
  );
}

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
  const c =
    PALETTE[
      index % PALETTE.length
    ];

  if (kind === 'star') {
    return (
      <Star fill={c} />
    );
  }

  if (kind === 'heart') {
    return (
      <Heart fill={c} />
    );
  }

  return (
    <Swirl color={c} />
  );
}

const ALL_CATEGORY =
  'ALL';

export default function BirthdayWall() {
  const [
    attendee,
    setAttendee,
  ] = useState<
    string | null
  >(null);

  const [
    photos,
    setPhotos,
  ] = useState<Photo[]>([]);

  const [
    open,
    setOpen,
  ] = useState(false);

  /*
   * MULTIPLE FILE UPLOAD
   *
   * One upload can contain up to
   * 200 files.
   */
  const [
    files,
    setFiles,
  ] = useState<File[]>([]);

  const [
    previews,
    setPreviews,
  ] = useState<string[]>(
    []
  );

  const [
    caption,
    setCaption,
  ] = useState('');

  const [
    message,
    setMessage,
  ] = useState('');

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    toast,
    setToast,
  ] = useState('');

  const [
    category,
    setCategory,
  ] = useState(
    ALL_CATEGORY
  );

  async function load() {
    try {
      const response =
        await fetch(
          '/api/photos',
          {
            cache:
              'no-store',
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

  /*
   * Clean up every object URL.
   */
  useEffect(() => {
    return () => {
      previews.forEach(
        (preview) => {
          URL.revokeObjectURL(
            preview
          );
        }
      );
    };
  }, [previews]);

  /*
   * Filter by selected guest.
   *
   * There is NO total-count limit here.
   */
  const visiblePhotos =
    useMemo(() => {
      if (
        category ===
        ALL_CATEGORY
      ) {
        return photos;
      }

      return photos.filter(
        (photo) =>
          photo.from ===
          category
      );
    }, [
      photos,
      category,
    ]);

  async function choose(
    name: string
  ) {
    setMessage('');

    try {
      const response =
        await fetch(
          '/api/attendee/select',
          {
            method:
              'POST',

            headers: {
              'content-type':
                'application/json',
            },

            body:
              JSON.stringify({
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
    } catch (error) {
      console.error(
        'Guest selection error:',
        error
      );

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
      (preview) => {
        URL.revokeObjectURL(
          preview
        );
      }
    );

    setPreviews([]);
  }

  /*
   * Pick up to 200 photos/videos.
   */
  function pick(
    selectedFiles:
      FileList | null
  ) {
    if (!selectedFiles) {
      return;
    }

    const incoming =
      Array.from(
        selectedFiles
      );

    if (
      incoming.length === 0
    ) {
      return;
    }

    /*
     * PER-UPLOAD LIMIT.
     *
     * This is NOT a wall limit.
     */
    if (
      incoming.length >
      MAX_FILES_PER_UPLOAD
    ) {
      setMessage(
        `You can choose up to ${MAX_FILES_PER_UPLOAD} photos or videos in one upload.`
      );

      return;
    }

    /*
     * Validate every selected file.
     */
    for (const file of incoming) {
      const image =
        file.type.startsWith(
          'image/'
        );

      const video =
        file.type.startsWith(
          'video/'
        );

      if (!image && !video) {
        setMessage(
          `"${file.name}" is not a photo or video.`
        );

        return;
      }

      const maxSize =
        video
          ? 200 *
            1024 *
            1024
          : 15 *
            1024 *
            1024;

      if (
        file.size >
        maxSize
      ) {
        setMessage(
          video
            ? `"${file.name}" is too large. Keep videos under 200 MB.`
            : `"${file.name}" is too large. Keep photos under 15 MB.`
        );

        return;
      }
    }

    /*
     * Revoke previous preview URLs.
     */
    previews.forEach(
      (preview) => {
        URL.revokeObjectURL(
          preview
        );
      }
    );

    const nextPreviews =
      incoming.map(
        (file) =>
          URL.createObjectURL(
            file
          )
      );

    setFiles(
      incoming
    );

    setPreviews(
      nextPreviews
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
      files.length === 0
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

    /*
     * This is the ONLY upload count
     * limit.
     */
    if (
      files.length >
      MAX_FILES_PER_UPLOAD
    ) {
      setMessage(
        `You can upload up to ${MAX_FILES_PER_UPLOAD} items at once.`
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
       * Every selected file uses
       * the SAME "files" field.
       *
       * The API uses form.getAll('files').
       */
      files.forEach(
        (file) => {
          form.append(
            'files',
            file
          );
        }
      );

      form.append(
        'caption',
        caption
      );

      const response =
        await fetch(
          '/api/upload',
          {
            method:
              'POST',
            body:
              form,
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
        () => {
          setToast('');
        },
        2500
      );
    } catch (error) {
      setMessage(
        error instanceof
          Error
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
        'Take this off the wall for everyone?'
      )
    ) {
      return;
    }

    const response =
      await fetch(
        '/api/delete',
        {
          method:
            'POST',

          headers: {
            'content-type':
              'application/json',
          },

          body:
            JSON.stringify({
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
        () => {
          setToast('');
        },
        2500
      );

      return;
    }

    setToast(
      'taken down'
    );

    await load();

    setTimeout(
      () => {
        setToast('');
      },
      2500
    );
  }

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
              pick your little
              corner of the
              wall
            </p>

            <div className="attendee-grid">
              {ATTENDEES.map(
                (name) => {
                  const isBeige =
                    BEIGE_NAMES.includes(
                      name
                    );

                  return (
                    <button
                      key={name}
                      className={`attendee-button ${
                        isBeige
                          ? 'attendee-button-beige'
                          : ''
                      }`}
                      onClick={() =>
                        choose(
                          name
                        )
                      }
                    >
                      {name}
                    </button>
                  );
                }
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
                  kind={
                    motif
                  }
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
                to the best,
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
                bring a memory,
                any 
              </span>

              <span className="tape">
                keep them here
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

                  setMessage(
                    ''
                  );

                  setOpen(
                    true
                  );
                }}
              >
                + add a photo
                or video
              </button>

              <span className="cta-note">
                {attendee
                  ? `you are ${attendee} · come create a memory`
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
            {visiblePhotos.length ===
            1
              ? '1 memory so far'
              : `${visiblePhotos.length} memories so far`}
          </p>
        </div>

        <div
          className="cat-row"
          role="tablist"
          aria-label="Filter the wall"
        >
          <button
            type="button"
            role="tab"
            aria-selected={
              category ===
              ALL_CATEGORY
            }
            className={`tape cat-chip ${
              category ===
              ALL_CATEGORY
                ? 'active'
                : ''
            }`}
            style={{
              transform: `rotate(${tiltFor(
                0
              )}deg)`,
            }}
            onClick={() =>
              setCategory(
                ALL_CATEGORY
              )
            }
          >
            all photos
            and videos
          </button>

          {ATTENDEES.map(
            (
              name,
              index
            ) => {
              const isBeige =
                BEIGE_NAMES.includes(
                  name
                );

              return (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  aria-selected={
                    category ===
                    name
                  }
                  className={`tape cat-chip ${
                    isBeige
                      ? 'cat-chip-beige'
                      : ''
                  } ${
                    category ===
                    name
                      ? 'active'
                      : ''
                  }`}
                  style={{
                    transform: `rotate(${tiltFor(
                      index +
                        1
                    )}deg)`,
                  }}
                  onClick={() =>
                    setCategory(
                      name
                    )
                  }
                >
                  {name}
                </button>
              );
            }
          )}
        </div>

        <div className="masonry">
          {visiblePhotos.length ===
          0 ? (
            <div
              className="empty guest-empty"
            >
              <span className="stitch">
                {category ===
                ALL_CATEGORY
                  ? 'nothing up yet'
                  : `nothing in ${category}'s box yet`}
              </span>

              <p>
                {category ===
                ALL_CATEGORY
                  ? 'Be the first one to pin a picture up.'
                  : 'This little corner is waiting for its first memory.'}
              </p>
            </div>
          ) : (
            visiblePhotos.map(
              (photo) => (
                <figure
                  className="card"
                  key={
                    photo.id
                  }
                  style={{
                    maxWidth:
                      '220px',
                    width:
                      '100%',
                    justifySelf:
                      'center',
                  }}
                >
                  <span className="pin">
                    <Star
                      fill="#addae8"
                    />
                  </span>

                  {photo.from ===
                    attendee && (
                    <button
                      className="del"
                      onClick={() =>
                        remove(
                          photo.id
                        )
                      }
                    >
                      remove
                    </button>
                  )}

                  <div className="frame">
                    {isVideo(
                      photo
                    ) ? (
                      <video
                        controls
                        preload="metadata"
                        src={`https://drive.google.com/uc?id=${encodeURIComponent(
                          photo.driveFileId
                        )}`}
                        poster={`https://drive.google.com/thumbnail?id=${encodeURIComponent(
                          photo.driveFileId
                        )}&sz=w1000`}
                      />
                    ) : (
                      <img
                        loading="lazy"
                        src={`https://drive.google.com/thumbnail?id=${encodeURIComponent(
                          photo.driveFileId
                        )}&sz=w1000`}
                        alt={
                          photo.caption ||
                          'A photo on the wall'
                        }
                      />
                    )}
                  </div>

                  {photo.caption && (
                    <figcaption className="cap">
                      {
                        photo.caption
                      }
                    </figcaption>
                  )}

                  {photo.from && (
                    <p className="by">
                      {
                        photo.from
                      }
                    </p>
                  )}
                </figure>
              )
            )
          )}
        </div>
      </main>

      <footer className="foot">
        <span className="foot-tape">
          made for loraine
          &amp; ren
        </span>

        <p className="row2">
          keep the photos
          coming all week ♡
        </p>
      </footer>

      {/* ADD PHOTO / VIDEO MODAL */}
      <div
        className={`veil ${
          open ? 'on' : ''
        }`}
        onClick={(
          event
        ) => {
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
            add some photos
            &amp; videos
          </h3>

          <p className="sub">
            they'll go straight
            into your little
            corner of the wall
          </p>

          <label className="drop">
            <b>
              choose photos
              &amp; videos
            </b>

            <small>
              {files.length >
              0
                ? `${files.length} ${
                    files.length ===
                    1
                      ? 'item'
                      : 'items'
                  } picked — tap to swap`
                : 'up to 200 items per upload · photos + videos'}
            </small>

            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(
                event
              ) => {
                pick(
                  event
                    .target
                    .files
                );

                /*
                 * Allows selecting
                 * the same files
                 * again later.
                 */
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

                  const video =
                    file?.type.startsWith(
                      'video/'
                    );

                  return (
                    <div
                      className="preview-item"
                      key={
                        preview
                      }
                    >
                      {video ? (
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
                          alt={`Selected photo ${
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
                        aria-label={`Remove item ${
                          index +
                          1
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
            caption, if you
            want one
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
                event.target
                  .value
              )
            }
            placeholder="blowing out the candles"
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
                  ? `put up ${files.length} items`
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

      {/*
       * Small targeted style overrides.
       *
       * These don't replace your existing
       * birthday-wall styling.
       */}
      <style jsx global>{`
        /*
         * Loraine + Ren use the same beige.
         */
.cat-chip-beige {
  background: #F6F6DE !important;
  color: #243e8b !important;
  border-color: #C4A97E !important;
}

.cat-chip-beige.active {
  background: #F6F6DE !important;
  border-color: #C4A97E !important;
}

        .attendee-button-beige {
          background: #AED8E8 !important;
          color: #243e8b !important;
        }

        /*
         * Make the empty guest box a real,
         * full container instead of allowing
         * it to collapse inside the masonry.
         */
.guest-empty {
  width: 100%;
  min-height: 260px;
  min-width: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 32px;
  margin: 12px auto 28px;
  grid-column: 1 / -1;
  break-inside: avoid;
}

        /*
         * Slightly smaller polaroids.
         */
.masonry .card {
  width: 100%;
  max-width: 220px;
  height: auto !important;
  min-height: 0 !important;
  margin-left: auto;
  margin-right: auto;
  break-inside: avoid;
}

.masonry .card .frame {
  width: 100%;
  height: auto !important;
  min-height: 0 !important;
}

.masonry .card .frame img,
.masonry .card .frame video {
  width: 100%;
  height: auto !important;
  max-width: 100%;
  object-fit: contain !important;
  display: block;
}

        /*
         * Keep the upload preview usable when
         * many files are selected.
         */
        .preview-grid {
          max-height: 310px;
          overflow-y: auto;
        }

        .preview-item video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
          .masonry {
  display: grid;
  justify-items: center;
  justify-content: center;
}

@media (max-width: 600px) {
  /*
   * MOBILE HERO
   */

  .hero {
    padding: 48px 12px 16px;
  }

  /* "a whole wall just for them" */
  .hero > .badge {
    padding: 5px 10px;
    gap: 6px;
    font-size: 8px;
    letter-spacing: .14em;
    box-shadow: 2px 2px 0 var(--navy);
  }

  .hero > .badge svg {
    width: 12px;
    height: 12px;
  }

  /*
   * BIGGER HAPPY BIRTHDAY
   */
  .hb1 {
    font-size: clamp(3.2rem, 14vw, 5.2rem);
  }

  .hb2 {
    font-size: clamp(3.8rem, 16vw, 6.2rem);
  }

  /*
   * SMALLER "PIN IT UP" BOXES
   */
  .tape-row {
    gap: 8px;
    margin-top: 22px;
  }

  .tape-row .tape {
    padding: 6px 10px;
    font-size: .82rem;
  }

  /*
   * SMALLER ADD PHOTO / VIDEO BUTTON
   */
  .cta-zone {
    gap: 8px;
    margin-top: 28px;
  }

  .cta {
    font-size: 11px;
    padding: 12px 23px;
    border-width: 2px;
    box-shadow:
      0 0 0 2px var(--cream),
      0 0 0 4px var(--navy),
      3px 4px 0 rgba(54,83,154,.35);
  }

  .cta-note {
    font-size: 8px;
    letter-spacing: .16em;
  }

  /*
   * SMALLER CATEGORY BOXES
   */
  .cat-row {
    gap: 8px;
    padding: 4px 8px 22px;
  }

  .cat-row .cat-chip {
    padding: 6px 10px;
    font-size: .82rem;
  }
}
      `}</style>
    </>
  );
}