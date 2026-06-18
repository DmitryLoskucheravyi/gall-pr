create database galleryDB

use  galleryDB

CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,

    first_name VARCHAR(100),
    last_name VARCHAR(100),
	
    role ENUM('USER', 'ADMIN') DEFAULT 'USER',

    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE users
ADD phone VARCHAR(20);

ALTER TABLE users
ADD addres VARCHAR(255);

alter table users drop column username

ALTER TABLE users
MODIFY phone VARCHAR(20) NOT NULL;

ALTER TABLE users
ADD COLUMN refresh_token TEXT NULL;

select * from users


CREATE TABLE paintings (
    id INT AUTO_INCREMENT PRIMARY KEY,

    title VARCHAR(255) NOT NULL UNIQUE,
    subtitle VARCHAR(255),

    card_image VARCHAR(500) NOT NULL,

    images JSON NOT NULL,

    price DECIMAL(10,2) NOT NULL,

    discount INT DEFAULT 0,

    amount INT NOT NULL DEFAULT 1,

    is_available BOOLEAN DEFAULT TRUE,

    is_featured BOOLEAN DEFAULT FALSE,

    author VARCHAR(255),

    technique VARCHAR(255),

    material VARCHAR(255),

    width INT,

    height INT,

    year INT,

    description TEXT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);
UPDATE users
SET role = 'ADMIN'
WHERE email = 'kererelore11@gmail.com';

