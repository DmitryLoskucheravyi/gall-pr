export type CreatePaintingDto = {
  title: string;
  titleEn?: string;

  subtitle?: string;
  subtitleEn?: string;

  cardImage: string;

  images: string[];

  // Empty array clears the interior section; otherwise 2..6.
  interiorImages?: string[];

  animation3dImage?: string;

  price: number;

  // How many copies exist. Absent on create means one — the gallery's normal
  // case — but it is settable now, which is also the only way to restock a
  // work that has sold out. The server keeps it and isAvailable consistent:
  // nothing with no copies left is ever for sale.
  amount?: number;

  isAvailable?: boolean;

  isFeatured?: boolean;

  isRepeatable?: boolean;

  techniqueId?: number;

  materialId?: number;

  // null clears it — a work can leave a series without being deleted.
  seriesId?: number | null;

  width?: number;

  height?: number;

  year?: number;
  weight?: number;

  description: string;
  descriptionEn?: string;
};
