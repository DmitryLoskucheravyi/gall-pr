import { useEffect, useMemo, useRef, useState } from 'react';

import { paintingsService } from '../../api/paintings.api';
import { materialsService } from '../../api/materials.api';
import { techniquesService } from '../../api/techniques.api';
import { uploadImage } from '../../api/uploads.api';
import type { Painting } from '../../types/painting.types';
import type { Material, Technique } from '../../types/dictionaries.types';
import Select from '../ui/Select';
import styles from './CreatePaintingForm.module.scss';

type Props = {
  painting?: Painting;
  onSaved: () => void;
  onClose: () => void;
};

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
  const [files, setFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(
    painting?.images ?? [],
  );
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    techniquesService.getTechniques().then(setTechniques);
    materialsService.getMaterials().then(setMaterials);
  }, []);

  const newFilePreviews = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );

  useEffect(() => {
    return () => {
      newFilePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newFilePreviews]);

  const techniqueOptions = [
    { value: '', label: 'Не вказано' },
    ...techniques.map((t) => ({ value: String(t.id), label: t.name })),
  ];
  const materialOptions = [
    { value: '', label: 'Не вказано' },
    ...materials.map((m) => ({ value: String(m.id), label: m.name })),
  ];

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setFiles((prev) => [...prev, ...Array.from(fileList)]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (existingImages.length === 0 && files.length === 0) {
      setError("Додайте хоча б одне фото");
      return;
    }

    try {
      setSaving(true);

      const uploadedUrls = await Promise.all(
        files.map(async (file) => (await uploadImage(file)).url),
      );

      const images = [...existingImages, ...uploadedUrls];

      const payload = {
        title,
        description,
        cardImage: images[0],
        images,
        price: Number(price),
        isFeatured,
        techniqueId: techniqueId ? Number(techniqueId) : undefined,
        materialId: materialId ? Number(materialId) : undefined,
        width: Number(width) || undefined,
        height: Number(height) || undefined,
        year: Number(year) || undefined,
      };

      if (painting) {
        await paintingsService.updatePainting(painting.id, payload);
      } else {
        await paintingsService.createPainting(payload);
      }

      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Не вдалося зберегти картину');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>
          {painting ? 'Редагування картини' : 'Створення картини'}
        </h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <span className={styles.fileLabel}>Фото</span>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFilesSelected(e.target.files)}
            className={styles.hiddenFileInput}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={styles.filePickerButton}
          >
            + Додати фото
          </button>

          {(existingImages.length > 0 || files.length > 0) && (
            <div className={styles.imagePreviews}>
              {existingImages.map((url) => (
                <div key={url} className={styles.imagePreviewWrap}>
                  <img src={url} alt="" className={styles.imagePreview} />
                  <button
                    type="button"
                    onClick={() =>
                      setExistingImages((prev) =>
                        prev.filter((item) => item !== url),
                      )
                    }
                    className={styles.removeImageButton}
                  >
                    ×
                  </button>
                </div>
              ))}

              {files.map((file, index) => (
                <div key={`${file.name}-${index}`} className={styles.imagePreviewWrap}>
                  <img
                    src={newFilePreviews[index]}
                    alt=""
                    className={styles.imagePreview}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFiles((prev) => prev.filter((_, i) => i !== index))
                    }
                    className={styles.removeImageButton}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
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
