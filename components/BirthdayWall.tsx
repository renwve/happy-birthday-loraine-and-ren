'use client';

import { useEffect, useMemo, useState } from 'react';
import { ATTENDEES } from '@/lib/attendees';

type Photo = {
  id: string;
  caption: string | null;
  driveFileId: string;
  driveUrl: string;
  createdAt: string;
  attendeeId: string;
  from: string | null;
};

const PALETTE = [
  '#36539a',
  '#addae8',
  '#c6a97c',
  '#243e8b',
];

function Star({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
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

function Heart({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 100 90" aria-hidden="true">
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

function Swirl({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
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
  const c = PALETTE[index % PALETTE.length];

  if (kind === 'star') {
    return <Star fill={c} />;
  }

  if (kind === 'heart') {
    return <Heart fill={c} />;
  }

  return <Swirl color={c} />;
}

export default function BirthdayWall() {
  const [attendee, setAttendee] =
    useState<string | null>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);

  const [open, setOpen] = useState(false);

  /*
   * MULTIPLE FILE STATE
   */
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(
    []
  );

  const [caption, setCaption] = useState('');

  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  async function load() {
    try {
      const response = await fetch('/api/photos', {
        cache: 'no-store',
      });

      const json = await response.json();

      if (response.ok) {
        setAttendee(json.attendee);
        setPhotos(json.photos || []);
      } else {
        setMessage(
          json.error || 'Could not load the wall.'
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

    const interval = setInterval(load, 5000);

    return () => clearInterval(interval);
  }, []);

  /*
   * Clean up object URLs when the component unmounts.
   */
  useEffect(() => {
    return () => {
      previews.forEach((preview) => {
        URL.revokeObjectURL(preview);
      });
    };
  }, [previews]);

  /*
   * Group the photos by attendee.
   */
  const photosByAttendee = useMemo(() => {
    const grouped: Record<string, Photo[]> = {};

    for (const photo of photos) {
      const name = photo.from || 'unknown guest';

      if (!grouped[name]) {
        grouped[name] = [];
      }

      grouped[name].push(photo);
    }

    return grouped;
  }, [photos]);

  /*
   * Keep the configured attendee order.
   *
   * This means the wall follows the same order as
   * your ATTENDEES array.
   */
  const attendeeSections = useMemo(() => {
    const configured = ATTENDEES.filter(
      (name) => photosByAttendee[name]?.length
    );
    
const unknown = Object.keys(
  photosByAttendee
).filter(
  (name) => !ATTENDEES.some(
    (attendeeName) => attendeeName === name
  )
);

    return [
      ...configured,
      ...unknown,
    ];
  }, [photosByAttendee]);

  async function choose(name: string) {
    setMessage('');

    try {
      const response = await fetch(
        '/api/attendee/select',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({ name }),
        }
      );

      const json = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        setMessage(
          json.error ||
            'Could not choose attendee. Please try again.'
        );
        return;
      }

      setAttendee(json.attendee || name);

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

    previews.forEach((preview) => {
      URL.revokeObjectURL(preview);
    });

    setPreviews([]);
  }

  /*
   * Add multiple selected files.
   */
  function pick(
    selectedFiles: FileList | null
  ) {
    if (!selectedFiles) return;

    const incoming = Array.from(selectedFiles);

    if (incoming.length === 0) {
      return;
    }

    /*
     * Limit the number of photos in one batch.
     */
    if (incoming.length > 30) {
      setMessage(
        'You can choose up to 30 photos at once.'
      );
      return;
    }

    /*
     * Validate every file before adding it.
     */
    for (const file of incoming) {
      if (!file.type.startsWith('image/')) {
        setMessage(
          `"${file.name}" is not a picture.`
        );
        return;
      }

      if (file.size > 15 * 1024 * 1024) {
        setMessage(
          `"${file.name}" is too large. Keep photos under 15 MB.`
        );
        return;
      }
    }

    /*
     * Remove previous preview URLs.
     */
    previews.forEach((preview) => {
      URL.revokeObjectURL(preview);
    });

    const nextFiles = incoming;
    const nextPreviews = nextFiles.map(
      (file) => URL.createObjectURL(file)
    );

    setFiles(nextFiles);
    setPreviews(nextPreviews);
    setMessage('');
  }

  /*
   * Remove one photo before uploading.
   */
  function removeSelected(index: number) {
    const nextFiles = files.filter(
      (_, fileIndex) => fileIndex !== index
    );

    const nextPreviews = previews.filter(
      (_, previewIndex) =>
        previewIndex !== index
    );

    const removedPreview = previews[index];

    if (removedPreview) {
      URL.revokeObjectURL(removedPreview);
    }

    setFiles(nextFiles);
    setPreviews(nextPreviews);
  }

  /*
   * Upload every selected photo.
   */
  async function upload() {
    if (files.length === 0) {
      setMessage(
        'Choose at least one photo first.'
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
        files.length === 1 ? 'photo' : 'photos'
      }…`
    );

    try {
      const form = new FormData();

      /*
       * IMPORTANT:
       * Every photo uses the same "files" field.
       *
       * The API uses form.getAll('files') to receive them.
       */
      files.forEach((file) => {
        form.append('files', file);
      });

      form.append('caption', caption);

      const response = await fetch(
        '/api/upload',
        {
          method: 'POST',
          body: form,
        }
      );

      const json = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          json.error || 'Upload failed.'
        );
      }

      resetModal();

      setToast(
        json.count === 1
          ? 'it is up ♡'
          : `${json.count} photos are up ♡`
      );

      await load();

      setTimeout(() => {
        setToast('');
      }, 2500);
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

  async function remove(id: string) {
    if (
      !confirm(
        'Take this photo off the wall for everyone?'
      )
    ) {
      return;
    }

    const response = await fetch(
      '/api/delete',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ id }),
      }
    );

    const json = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      setToast(
        json.error || 'Could not remove it'
      );

      setTimeout(() => {
        setToast('');
      }, 2500);

      return;
    }

    setToast('taken down');

    await load();

    setTimeout(() => {
      setToast('');
    }, 2500);
  }

  function renderPhotoCard(photo: Photo) {
    return (
      <figure
        className="card"
        key={photo.id}
      >
        <span className="pin">
          <Star fill="#addae8" />
        </span>

        {photo.from === attendee && (
          <button
            className="del"
            onClick={() =>
              remove(photo.id)
            }
          >
            remove
          </button>
        )}

        <div className="frame">
          <img
            loading="lazy"
            src={`https://drive.google.com/thumbnail?id=${encodeURIComponent(
              photo.driveFileId
            )}&sz=w1200`}
            alt={
              photo.caption ||
              'A photo on the wall'
            }
          />
        </div>

        {photo.caption && (
          <figcaption className="cap">
            {photo.caption}
          </figcaption>
        )}

        {photo.from && (
          <p className="by">
            {photo.from}
          </p>
        )}
      </figure>
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

            <h2>who are you?</h2>

            <p>
              pick your little corner of the
              wall
            </p>

            <div className="attendee-grid">
              {ATTENDEES.map((name) => (
                <button
                  key={name}
                  className="attendee-button"
                  onClick={() =>
                    choose(name)
                  }
                >
                  {name}
                </button>
              ))}
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
          ).map((motif, index) => (
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
          ))}

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
                + add a photo
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
              ? '1 photo so far'
              : `${photos.length} photos so far`}
          </p>
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
        ) : (
          <div className="guest-sections">
            {attendeeSections.map(
              (guest, sectionIndex) => {
                const guestPhotos =
                  photosByAttendee[
                    guest
                  ] || [];

                return (
                  <section
                    className="guest-section"
                    key={guest}
                  >
                    <div className="guest-heading">
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
                          photos from
                        </p>

                        <h3 className="stitch">
                          {guest}
                        </h3>
                      </div>

                      <span className="guest-count">
                        {guestPhotos.length}{' '}
                        {guestPhotos.length ===
                        1
                          ? 'photo'
                          : 'photos'}
                      </span>
                    </div>

                    <div className="masonry">
                      {guestPhotos.map(
                        renderPhotoCard
                      )}
                    </div>
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
          keep the photos coming all week ♡
        </p>
      </footer>

      {/* ADD PHOTO MODAL */}
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
          aria-label="Add photos"
        >
          <h3>add some photos</h3>

          <p className="sub">
            they'll go into your little
            corner of the wall
          </p>

          <label className="drop">
            <b>
              choose photos
            </b>

            <small>
              {files.length > 0
                ? `${files.length} ${
                    files.length === 1
                      ? 'photo'
                      : 'photos'
                  } picked — tap to swap`
                : 'JPG · PNG · GIF · WEBP · up to 30 photos'}
            </small>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                pick(
                  event.target.files
                );

                /*
                 * Allows selecting the same
                 * file again later.
                 */
                event.currentTarget.value =
                  '';
              }}
            />
          </label>

          {previews.length > 0 && (
            <div className="preview-grid">
              {previews.map(
                (preview, index) => (
                  <div
                    className="preview-item"
                    key={preview}
                  >
                    <img
                      src={preview}
                      alt={`Selected photo ${
                        index + 1
                      }`}
                    />

                    <button
                      type="button"
                      className="preview-remove"
                      onClick={() =>
                        removeSelected(
                          index
                        )
                      }
                      aria-label={`Remove photo ${
                        index + 1
                      }`}
                    >
                      ×
                    </button>
                  </div>
                )
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
            value={attendee || ''}
          />

          <div className="row">
            <button
              type="button"
              className="ghost"
              onClick={resetModal}
              disabled={busy}
            >
              back
            </button>

            <button
              type="button"
              className="solid"
              disabled={
                files.length === 0 ||
                busy
              }
              onClick={upload}
            >
              {busy
                ? `putting up ${
                    files.length
                  }…`
                : files.length > 1
                  ? `put up ${files.length} photos`
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
    </>
  );
}