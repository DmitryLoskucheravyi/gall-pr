ALTER TABLE paintings DROP COLUMN material;
ALTER TABLE paintings DROP COLUMN technique;

ALTER TABLE paintings ADD COLUMN material_id INT NULL;
ALTER TABLE paintings ADD COLUMN technique_id INT NULL;

ALTER TABLE paintings ADD CONSTRAINT fk_paintings_material FOREIGN KEY (material_id) REFERENCES materials(id);
ALTER TABLE paintings ADD CONSTRAINT fk_paintings_technique FOREIGN KEY (technique_id) REFERENCES techniques(id);
