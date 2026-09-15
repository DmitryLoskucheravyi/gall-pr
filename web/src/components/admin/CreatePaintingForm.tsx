import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useLocale } from '../../hooks/useLocale';
import { pickLocale } from '../../utils/localizedField';
import { uploadImage } from '../../api/uploads.api';
import type { Painting } from '../../types/painting.types';
import { useTechniques } from '../../hooks/queries/useTechniques';
import { useMaterials } from '../../hooks/queries/useMaterials';
import {
  useCreatePaintingMutation,
  useUpdatePaintingMutation,
} from '../../hooks/mutations/usePaintingMutations';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import Select from '../ui/Select';
import Checkbox from '../ui/Checkbox';
import Radio from '../ui/Radio';
import styles from './CreatePaintingForm.module.scss';

type Props = {
  painting?: Painting;
  onSaved: () => void;
  onClose: () => void;
};

type PendingImage = { file: File; previewUrl: string };

// Mirrors INTERIOR_IMAGES_MIN/MAX in the backend's create-painting.dto.ts —
// the server rejects anything outside this, so the form shouldn't let it get
// that far.
const INTERIOR_MIN = 2;
const INTERIOR_MAX = 6;

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1899 }, (_, i) => {
  const year = CURRENT_YEAR - i;
  return { value: String(year), label: String(year) };
});

export default function CreatePaintingForm({
  painting,
  onSaved,
  onClose,
}: Props) {
  const { t } = useTranslation('admin');
  const locale = useLocale();
  useEscapeKey(onClose, true);

  const [title, setTitle] = useState(painting?.title ?? '');
  const [titleEn, setTitleEn] = useState(painting?.titleEn ?? '');
  const [description, setDescription] = useState(painting?.description ?? '');
  const [descriptionEn, setDescriptionEn] = useState(painting?.descriptionEn ?? '');
  const [price, setPrice] = useState(painting?.price?.toString() ?? '');
  const [techniqueId, setTechniqueId] = useState(
    painting?.techniqueId?.toString() ?? '',
  );
  const [materialId, setMaterialId] = useState(
    painting?.materialId?.toString() ?? '',
  );
  const [width, setWidth] = useState(painting?.width?.toString() ?? '');
  const [height, setHeight] = useState(painting?.height?.toString() ?? '');
  const [year, setYear] = useState(painting?.year?.toString() ?? '');
  const [weight, setWeight] = useState(painting?.weight?.toString() ?? '0.5');
  const [isFeatured, setIsFeatured] = useState(painting?.isFeatured ?? false);
  // Unique unless said otherwise — promising a repeat that isn't on offer is
  // worse than staying quiet about one that is.
  const [isRepeatable, setIsRepeatable] = useState(
    painting?.isRepeatable ?? false,
  );

  const [existingCover, setExistingCover] = useState<string | null>(
    painting?.cardImage ?? null,
  );
  const [coverImage, setCoverImage] = useState<PendingImage | null>(null);

  const [existingGalleryImages, setExistingGalleryImages] = useState<
    string[]
  >((painting?.images ?? []).filter((url) => url !== painting?.cardImage));
  const [galleryImages, setGalleryImages] = useState<PendingImage[]>([]);

  const [existingInteriorImages, setExistingInteriorImages] = useState<
    string[]
  >(painting?.interiorImages ?? []);
  const [interiorImages, setInteriorImages] = useState<PendingImage[]>([]);

  const [existingAnimationImage, setExistingAnimationImage] = useState<
    string | null
  >(painting?.animation3dImage ?? null);
  const [animationImage, setAnimationImage] = useState<PendingImage | null>(
    null,
  );

  const { data: techniques = [] } = useTechniques();
  const { data: materials = [] } = useMaterials();
  const createPainting = useCreatePaintingMutation();
  const updatePainting = useUpdatePaintingMutation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const interiorFileInputRef = useRef<HTMLInputElement>(null);
  const animationFileInputRef = useRef<HTMLInputElement>(null);

  // Each preview URL is created exactly once, when its file is selected,
  // and only ever revoked when that entry is explicitly removed or the
  // form unmounts. Recomputing every URL on each selection change (e.g.
  // via a useMemo keyed off the whole array) was the previous approach,
  // and revoking/recreating already-displayed previews on every unrelated
  // change is what made newly added photos intermittently fail to render.
  const coverImageRef = useRef(coverImage);
  const galleryImagesRef = useRef(galleryImages);
  const interiorImagesRef = useRef(interiorImages);
  const animationImageRef = useRef(animationImage);
  useEffect(() => {
    coverImageRef.current = coverImage;
  }, [coverImage]);
  useEffect(() => {
    galleryImagesRef.current = galleryImages;
  }, [galleryImages]);
  useEffect(() => {
    interiorImagesRef.current = interiorImages;
  }, [interiorImages]);
  useEffect(() => {
    animationImageRef.current = animationImage;
  }, [animationImage]);

  useEffect(() => {
    return () => {
      if (coverImageRef.current) {
        URL.revokeObjectURL(coverImageRef.current.previewUrl);
      }
      if (animationImageRef.current) {
        URL.revokeObjectURL(animationImageRef.current.previewUrl);
      }
      galleryImagesRef.current.forEach((item) =>
        URL.revokeObjectURL(item.previewUrl),
      );
      interiorImagesRef.current.forEach((item) =>
        URL.revokeObjectURL(item.previewUrl),
      );
    };
  }, []);

  const techniqueOptions = [
    { value: '', label: t('paintingForm.notSet') },
    ...techniques.map((tech) => ({
      value: String(tech.id),
      label: pickLocale(tech, 'name', locale),
    })),
  ];
  const materialOptions = [
    { value: '', label: t('paintingForm.notSet') },
    ...materials.map((m) => ({ value: String(m.id), label: pickLocale(m, 'name', locale) })),
  ];

  const handleCoverSelected = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;

    if (coverImage) URL.revokeObjectURL(coverImage.previewUrl);
    setCoverImage({ file, previewUrl: URL.createObjectURL(file) });
    setExistingCover(null);
    if (coverFileInputRef.current) coverFileInputRef.current.value = '';
  };

  const handleRemoveCover = () => {
    if (coverImage) URL.revokeObjectURL(coverImage.previewUrl);
    setCoverImage(null);
    setExistingCover(null);
  };

  const handleGalleryFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const selected = Array.from(fileList).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setGalleryImages((prev) => [...prev, ...selected]);
    if (galleryFileInputRef.current) galleryFileInputRef.current.value = '';
  };

  const handleRemoveGalleryImage = (index: number) => {
    setGalleryImages((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Capped as they're picked rather than rejected on save: telling someone
  // they chose too many after they've waited for six uploads is a worse
  // conversation than quietly taking the first six.
  const handleInteriorFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const room = INTERIOR_MAX - existingInteriorImages.length - interiorImages.length;
    if (room <= 0) {
      if (interiorFileInputRef.current) interiorFileInputRef.current.value = '';
      return;
    }

    const selected = Array.from(fileList)
      .slice(0, room)
      .map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));

    setInteriorImages((prev) => [...prev, ...selected]);
    if (interiorFileInputRef.current) interiorFileInputRef.current.value = '';
  };

  const handleRemoveInteriorImage = (index: number) => {
    setInteriorImages((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleAnimationImageSelected = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;

    if (animationImage) URL.revokeObjectURL(animationImage.previewUrl);
    setAnimationImage({ file, previewUrl: URL.createObjectURL(file) });
    setExistingAnimationImage(null);
    if (animationFileInputRef.current) animationFileInputRef.current.value = '';
  };

  const handleRemoveAnimationImage = () => {
    if (animationImage) URL.revokeObjectURL(animationImage.previewUrl);
    setAnimationImage(null);
    setExistingAnimationImage(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!existingCover && !coverImage) {
      setError(t('paintingForm.errors.coverRequired'));
      return;
    }

    // Checked before anything is uploaded, so a wrong count costs nothing.
    const interiorCount =
      existingInteriorImages.length + interiorImages.length;
    if (interiorCount > 0 && interiorCount < INTERIOR_MIN) {
      setError(t('paintingForm.errors.interiorCount', { min: INTERIOR_MIN }));
      return;
    }

    try {
      setSaving(true);

      let coverUrl = existingCover;
      if (coverImage) {
        const { url } = await uploadImage(coverImage.file);
        coverUrl = url;
        URL.revokeObjectURL(coverImage.previewUrl);
      }

      // Upload one at a time rather than in parallel: if a single photo
      // hits a transient failure, we keep whatever already succeeded
      // (folded into existingGalleryImages) instead of losing the whole
      // batch and forcing a full re-upload of everything on retry.
      const uploadedGalleryUrls: string[] = [];
      const failedGalleryImages: PendingImage[] = [];

      for (const item of galleryImages) {
        try {
          const { url } = await uploadImage(item.file);
          uploadedGalleryUrls.push(url);
          URL.revokeObjectURL(item.previewUrl);
        } catch {
          failedGalleryImages.push(item);
        }
      }

      if (failedGalleryImages.length > 0) {
        setExistingGalleryImages((prev) => [...prev, ...uploadedGalleryUrls]);
        setGalleryImages(failedGalleryImages);
        setError(
          t('paintingForm.errors.galleryUploadFailed', {
            failed: failedGalleryImages.length,
            total: galleryImages.length,
          }),
        );
        return;
      }

      // Same one-at-a-time reasoning as the gallery above: a failure part-way
      // keeps what already uploaded instead of costing the whole batch.
      const uploadedInteriorUrls: string[] = [];
      const failedInteriorImages: PendingImage[] = [];

      for (const item of interiorImages) {
        try {
          const { url } = await uploadImage(item.file);
          uploadedInteriorUrls.push(url);
          URL.revokeObjectURL(item.previewUrl);
        } catch {
          failedInteriorImages.push(item);
        }
      }

      if (failedInteriorImages.length > 0) {
        setExistingInteriorImages((prev) => [...prev, ...uploadedInteriorUrls]);
        setInteriorImages(failedInteriorImages);
        setError(
          t('paintingForm.errors.interiorUploadFailed', {
            failed: failedInteriorImages.length,
            total: interiorImages.length,
          }),
        );
        return;
      }

      let animationImageUrl = existingAnimationImage;
      if (animationImage) {
        const { url } = await uploadImage(animationImage.file);
        animationImageUrl = url;
        URL.revokeObjectURL(animationImage.previewUrl);
      }

      const gallery = [...existingGalleryImages, ...uploadedGalleryUrls];
      const interior = [...existingInteriorImages, ...uploadedInteriorUrls];

      const payload = {
        title,
        titleEn: titleEn.trim() || undefined,
        description,
        descriptionEn: descriptionEn.trim() || undefined,
        cardImage: coverUrl!,
        images: [coverUrl!, ...gallery],
        // Always sent, including as [] — that's how removing every interior
        // photo clears the section rather than leaving the old ones in place.
        interiorImages: interior,
        animation3dImage: animationImageUrl ?? undefined,
        price: Number(price),
        isFeatured,
        isRepeatable,
        techniqueId: techniqueId ? Number(techniqueId) : undefined,
        materialId: materialId ? Number(materialId) : undefined,
        width: Number(width) || undefined,
        height: Number(height) || undefined,
        year: Number(year) || undefined,
        weight: Number(weight) || undefined,
      };

      if (painting) {
        await updatePainting.mutateAsync({ id: painting.id, data: payload });
      } else {
        await createPainting.mutateAsync(payload);
      }

      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('paintingForm.errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const coverPreviewUrl = coverImage?.previewUrl ?? existingCover;
  const animationPreviewUrl =
    animationImage?.previewUrl ?? existingAnimationImage;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <h2 className={styles.title}>
          {painting ? t('paintingForm.editTitle') : t('paintingForm.createTitle')}
        </h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <span className={styles.fileLabel}>{t('paintingForm.cover')}</span>

          <input
            ref={coverFileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleCoverSelected(e.target.files)}
            className={styles.hiddenFileInput}
          />

          {coverPreviewUrl ? (
            <div className={styles.imagePreviews}>
              <div className={styles.imagePreviewWrap}>
                <img
                  src={coverPreviewUrl}
                  alt=""
                  className={styles.imagePreview}
                />
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  className={styles.removeImageButton}
                >
                  ×
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverFileInputRef.current?.click()}
              className={styles.filePickerButton}
            >
              {t('paintingForm.addCover')}
            </button>
          )}

          <span className={styles.fileLabel}>{t('paintingForm.otherPhotos')}</span>

          <input
            ref={galleryFileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleGalleryFilesSelected(e.target.files)}
            className={styles.hiddenFileInput}
          />

          <button
            type="button"
            onClick={() => galleryFileInputRef.current?.click()}
            className={styles.filePickerButton}
          >
            {t('paintingForm.addPhotos')}
          </button>

          {(existingGalleryImages.length > 0 || galleryImages.length > 0) && (
            <div className={styles.imagePreviews}>
              {existingGalleryImages.map((url) => (
                <div key={url} className={styles.imagePreviewWrap}>
                  <img src={url} alt="" className={styles.imagePreview} />
                  <button
                    type="button"
                    onClick={() =>
                      setExistingGalleryImages((prev) =>
                        prev.filter((item) => item !== url),
                      )
                    }
                    className={styles.removeImageButton}
                  >
                    ×
                  </button>
                </div>
              ))}

              {galleryImages.map((item, index) => (
                <div key={item.previewUrl} className={styles.imagePreviewWrap}>
                  <img
                    src={item.previewUrl}
                    alt=""
                    className={styles.imagePreview}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveGalleryImage(index)}
                    className={styles.removeImageButton}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <span className={styles.fileLabel}>
            {t('paintingForm.interiorPhotos')}
            <span className={styles.fileHint}>
              {' '}
              {t('paintingForm.interiorHint', {
                min: INTERIOR_MIN,
                max: INTERIOR_MAX,
              })}
            </span>
          </span>

          <input
            ref={interiorFileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleInteriorFilesSelected(e.target.files)}
            className={styles.hiddenFileInput}
          />

          {existingInteriorImages.length + interiorImages.length <
            INTERIOR_MAX && (
            <button
              type="button"
              onClick={() => interiorFileInputRef.current?.click()}
              className={styles.filePickerButton}
            >
              {t('paintingForm.addPhotosCount', {
                count: existingInteriorImages.length + interiorImages.length,
                max: INTERIOR_MAX,
              })}
            </button>
          )}

          {(existingInteriorImages.length > 0 || interiorImages.length > 0) && (
            <div className={styles.imagePreviews}>
              {existingInteriorImages.map((url) => (
                <div key={url} className={styles.imagePreviewWrap}>
                  <img src={url} alt="" className={styles.imagePreview} />
                  <button
                    type="button"
                    onClick={() =>
                      setExistingInteriorImages((prev) =>
                        prev.filter((item) => item !== url),
                      )
                    }
                    className={styles.removeImageButton}
                  >
                    ×
                  </button>
                </div>
              ))}

              {interiorImages.map((item, index) => (
                <div key={item.previewUrl} className={styles.imagePreviewWrap}>
                  <img
                    src={item.previewUrl}
                    alt=""
                    className={styles.imagePreview}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveInteriorImage(index)}
                    className={styles.removeImageButton}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <span className={styles.fileLabel}>
            {t('paintingForm.animationPhotos')}{' '}
            <span className={styles.soonBadge}>{t('paintingForm.soon')}</span>
          </span>

          <input
            ref={animationFileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleAnimationImageSelected(e.target.files)}
            className={styles.hiddenFileInput}
          />

          {animationPreviewUrl ? (
            <div className={styles.imagePreviews}>
              <div className={styles.imagePreviewWrap}>
                <img
                  src={animationPreviewUrl}
                  alt=""
                  className={styles.imagePreview}
                />
                <button
                  type="button"
                  onClick={handleRemoveAnimationImage}
                  className={styles.removeImageButton}
                >
                  ×
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => animationFileInputRef.current?.click()}
              className={styles.filePickerButton}
            >
              {t('paintingForm.addPhotos')}
            </button>
          )}

          <input
            required
            placeholder={t('paintingForm.titlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.input}
          />

          <input
            placeholder={t('paintingForm.titleEnPlaceholder')}
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            className={styles.input}
          />

          <input
            required
            type="number"
            placeholder={t('paintingForm.pricePlaceholder')}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={styles.input}
          />

          <input
            type="number"
            step="0.01"
            placeholder={t('paintingForm.weightPlaceholder')}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={styles.input}
          />

          <Select
            value={techniqueId}
            onChange={setTechniqueId}
            options={techniqueOptions}
            placeholder={t('paintingForm.techniquePlaceholder')}
          />

          <Select
            value={materialId}
            onChange={setMaterialId}
            options={materialOptions}
            placeholder={t('paintingForm.materialPlaceholder')}
          />

          <div className={styles.row3}>
            <input
              type="number"
              placeholder={t('paintingForm.widthPlaceholder')}
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className={styles.input}
            />
            <input
              type="number"
              placeholder={t('paintingForm.heightPlaceholder')}
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className={styles.input}
            />
            <Select
              value={year}
              onChange={setYear}
              options={YEAR_OPTIONS}
              placeholder={t('paintingForm.yearPlaceholder')}
            />
          </div>

          <textarea
            required
            placeholder={t('paintingForm.descriptionPlaceholder')}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={styles.textarea}
          />

          <textarea
            placeholder={t('paintingForm.descriptionEnPlaceholder')}
            rows={4}
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
            className={styles.textarea}
          />

          <Checkbox checked={isFeatured} onChange={setIsFeatured}>
            {t('paintingForm.featured')}
          </Checkbox>

          {/* Radio rather than a checkbox: these are two answers to one
              question, and "not unique" is not the same statement as
              "available as a repeat". Spelling both out means the choice is
              made deliberately for every work. */}
          <span className={styles.fileLabel}>
            {t('paintingForm.editionLabel')}
            <span className={styles.fileHint}> {t('paintingForm.editionHint')}</span>
          </span>

          <div className={styles.editionChoice}>
            <Radio
              name="edition"
              checked={!isRepeatable}
              onChange={() => setIsRepeatable(false)}
            >
              {t('paintingForm.editionUnique')}
            </Radio>

            <Radio
              name="edition"
              checked={isRepeatable}
              onChange={() => setIsRepeatable(true)}
            >
              {t('paintingForm.editionRepeatable')}
            </Radio>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              {t('paintingForm.cancel')}
            </button>
            <button type="submit" disabled={saving} className={styles.saveButton}>
              {saving
                ? t('paintingForm.saving')
                : painting
                  ? t('paintingForm.update')
                  : t('paintingForm.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
