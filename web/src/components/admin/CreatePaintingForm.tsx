import { useEffect, useRef, useState } from 'react';

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
import styles from './CreatePaintingForm.module.scss';

type Props = {
  painting?: Painting;
  onSaved: () => void;
  onClose: () => void;
};

type PendingImage = { file: File; previewUrl: string };

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
  useEscapeKey(onClose, true);

  const [title, setTitle] = useState(painting?.title ?? '');
  const [description, setDescription] = useState(painting?.description ?? '');
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
  const [isFeatured, setIsFeatured] = useState(painting?.isFeatured ?? false);

  const [existingCover, setExistingCover] = useState<string | null>(
    painting?.cardImage ?? null,
  );
  const [coverImage, setCoverImage] = useState<PendingImage | null>(null);

  const [existingGalleryImages, setExistingGalleryImages] = useState<
    string[]
  >((painting?.images ?? []).filter((url) => url !== painting?.cardImage));
  const [galleryImages, setGalleryImages] = useState<PendingImage[]>([]);

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
  const animationFileInputRef = useRef<HTMLInputElement>(null);

  // Each preview URL is created exactly once, when its file is selected,
  // and only ever revoked when that entry is explicitly removed or the
  // form unmounts. Recomputing every URL on each selection change (e.g.
  // via a useMemo keyed off the whole array) was the previous approach,
  // and revoking/recreating already-displayed previews on every unrelated
  // change is what made newly added photos intermittently fail to render.
  const coverImageRef = useRef(coverImage);
  const galleryImagesRef = useRef(galleryImages);
  const animationImageRef = useRef(animationImage);
  useEffect(() => {
    coverImageRef.current = coverImage;
  }, [coverImage]);
  useEffect(() => {
    galleryImagesRef.current = galleryImages;
  }, [galleryImages]);
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
    };
  }, []);

  const techniqueOptions = [
    { value: '', label: 'Не вказано' },
    ...techniques.map((t) => ({ value: String(t.id), label: t.name })),
  ];
  const materialOptions = [
    { value: '', label: 'Не вказано' },
    ...materials.map((m) => ({ value: String(m.id), label: m.name })),
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
      setError('Додайте фото обкладинки');
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
          `Не вдалося завантажити ${failedGalleryImages.length} з ${galleryImages.length} фото. Решта збережені — спробуйте ще раз.`,
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

      const payload = {
        title,
        description,
        cardImage: coverUrl!,
        images: [coverUrl!, ...gallery],
        animation3dImage: animationImageUrl ?? undefined,
        price: Number(price),
        isFeatured,
        techniqueId: techniqueId ? Number(techniqueId) : undefined,
        materialId: materialId ? Number(materialId) : undefined,
        width: Number(width) || undefined,
        height: Number(height) || undefined,
        year: Number(year) || undefined,
      };

      if (painting) {
        await updatePainting.mutateAsync({ id: painting.id, data: payload });
      } else {
        await createPainting.mutateAsync(payload);
      }

      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Не вдалося зберегти картину');
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
          {painting ? 'Редагування картини' : 'Створення картини'}
        </h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <span className={styles.fileLabel}>Обкладинка</span>

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
              + Додати обкладинку
            </button>
          )}

          <span className={styles.fileLabel}>Інші фото</span>

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
            + Додати фото
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
            Фото для 3D-анімації <span className={styles.soonBadge}>скоро</span>
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
              + Додати фото
            </button>
          )}

          <input
            required
            placeholder="Назва"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.input}
          />

          <input
            required
            type="number"
            placeholder="Ціна"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={styles.input}
          />

          <Select
            value={techniqueId}
            onChange={setTechniqueId}
            options={techniqueOptions}
            placeholder="Техніка"
          />

          <Select
            value={materialId}
            onChange={setMaterialId}
            options={materialOptions}
            placeholder="Матеріал"
          />

          <div className={styles.row3}>
            <input
              type="number"
              placeholder="Ширина"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className={styles.input}
            />
            <input
              type="number"
              placeholder="Висота"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className={styles.input}
            />
            <Select
              value={year}
              onChange={setYear}
              options={YEAR_OPTIONS}
              placeholder="Рік"
            />
          </div>

          <textarea
            required
            placeholder="Опис"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={styles.textarea}
          />

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
            />
            Featured
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Скасувати
            </button>
            <button type="submit" disabled={saving} className={styles.saveButton}>
              {saving
                ? 'Зберігаємо…'
                : painting
                  ? 'Оновити картину'
                  : 'Створити картину'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
