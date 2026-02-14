package sqlserver

import (
	"context"
	"database/sql"
	"time"

	"user-service/internal/domain"
)

type UserRepositoryImpl struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepositoryImpl {
	return &UserRepositoryImpl{db: db}
}

func (r *UserRepositoryImpl) Create(user *domain.User) error {
	query := `
    INSERT INTO Usuario (Email, PasswordHash, Rol, NombreCompleto, Telefono)
    OUTPUT INSERTED.Id
    VALUES (@Email, @PasswordHash, @Rol, @NombreCompleto, @Telefono)
    `

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var telefono sql.NullString
	if user.Telefono != nil && *user.Telefono != "" {
		telefono = sql.NullString{String: *user.Telefono, Valid: true}
	}

	err := r.db.QueryRowContext(ctx, query,
		sql.Named("Email", user.Email),
		sql.Named("PasswordHash", user.PasswordHash),
		sql.Named("Rol", user.Role),
		sql.Named("NombreCompleto", user.NombreCompleto),
		sql.Named("Telefono", telefono),
		//sql.Named("FechaRegistro", user.FechaRegistro),
	).Scan(&user.ID)

	return err
}

func (r *UserRepositoryImpl) FindByID(id int) (*domain.User, error) {
	query := `
    SELECT Id, Email, PasswordHash, Rol, NombreCompleto, Telefono, FechaRegistro
    FROM Usuario
    WHERE Id = @Id
    `

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user domain.User
	var telefono sql.NullString

	err := r.db.QueryRowContext(ctx, query, sql.Named("Id", id)).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&user.NombreCompleto,
		&telefono,
		&user.FechaRegistro,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if telefono.Valid {
		user.Telefono = &telefono.String
	}

	return &user, nil
}

func (r *UserRepositoryImpl) FindByEmail(email string) (*domain.User, error) {
	query := `
    SELECT Id, Email, PasswordHash, Rol, NombreCompleto, Telefono, FechaRegistro
    FROM Usuario
    WHERE Email = @Email
    `

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user domain.User
	var telefono sql.NullString

	err := r.db.QueryRowContext(ctx, query, sql.Named("Email", email)).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&user.NombreCompleto,
		&telefono,
		&user.FechaRegistro,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if telefono.Valid {
		user.Telefono = &telefono.String
	}

	return &user, nil
}

func (r *UserRepositoryImpl) Update(user *domain.User) error {
	query := `
    UPDATE Usuario
    SET Email = @Email, 
        NombreCompleto = @NombreCompleto, 
        Telefono = @Telefono
    WHERE Id = @Id
    `

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var telefono sql.NullString
	if user.Telefono != nil && *user.Telefono != "" {
		telefono = sql.NullString{String: *user.Telefono, Valid: true}
	}

	_, err := r.db.ExecContext(ctx, query,
		sql.Named("Email", user.Email),
		sql.Named("NombreCompleto", user.NombreCompleto),
		sql.Named("Telefono", telefono),
		sql.Named("Id", user.ID),
	)

	return err
}

func (r *UserRepositoryImpl) Delete(id int) error {
	query := `DELETE FROM Usuario WHERE Id = @Id`

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.db.ExecContext(ctx, query, sql.Named("Id", id))
	return err
}

func (r *UserRepositoryImpl) FindAll(limit, offset int) ([]domain.User, error) {
	query := `
    SELECT Id, Email, PasswordHash, Rol, NombreCompleto, Telefono, FechaRegistro
    FROM Usuario
    ORDER BY Id
    OFFSET @Offset ROWS
    FETCH NEXT @Limit ROWS ONLY
    `

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := r.db.QueryContext(ctx, query,
		sql.Named("Offset", offset),
		sql.Named("Limit", limit),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []domain.User
	for rows.Next() {
		var user domain.User
		var telefono sql.NullString

		err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.PasswordHash,
			&user.Role,
			&user.NombreCompleto,
			&telefono,
			&user.FechaRegistro,
		)
		if err != nil {
			return nil, err
		}

		if telefono.Valid {
			user.Telefono = &telefono.String
		}

		users = append(users, user)
	}

	return users, nil
}

func (r *UserRepositoryImpl) Count() (int, error) {
	query := `SELECT COUNT(*) FROM Usuario`

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var count int
	err := r.db.QueryRowContext(ctx, query).Scan(&count)
	return count, err
}
