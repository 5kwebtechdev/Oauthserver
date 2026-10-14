CREATE TABLE note (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    owner_username VARCHAR(100) NOT NULL,
    title          VARCHAR(200) NOT NULL,
    content        TEXT         DEFAULT NULL,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_note_owner_username (owner_username)
) ENGINE = InnoDB;
