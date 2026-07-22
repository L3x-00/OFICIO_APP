import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderPhotoGallery } from '@/components/provider-photo-gallery';

const { uploadProviderImage, toast } = vi.hoisted(() => ({
  uploadProviderImage: vi.fn(),
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/lib/api', () => ({
  uploadProviderImage: (...args: unknown[]) => uploadProviderImage(...args),
}));
vi.mock('sonner', () => ({ toast }));

beforeEach(() => {
  uploadProviderImage.mockReset();
  toast.error.mockReset();
  toast.success.mockReset();
});

describe('ProviderPhotoGallery', () => {
  it('permite una carga cuando el proveedor no tiene fotos', async () => {
    const uploaded = {
      id: 9,
      url: 'https://cdn.test/perfil.jpg',
      isCover: true,
    };
    uploadProviderImage.mockResolvedValue(uploaded);
    const onUploaded = vi.fn();
    render(
      <ProviderPhotoGallery
        providerId={7}
        images={[]}
        allowEmptyUpload
        onUploaded={onUploaded}
      />,
    );

    const file = new File(['foto'], 'perfil.jpg', { type: 'image/jpeg' });
    await userEvent.upload(
      screen.getByLabelText('Seleccionar foto del proveedor'),
      file,
    );

    await waitFor(() =>
      expect(uploadProviderImage).toHaveBeenCalledWith(7, file),
    );
    expect(onUploaded).toHaveBeenCalledWith(uploaded);
    expect(toast.success).toHaveBeenCalledWith('Foto agregada al perfil.');
  });

  it('solo muestra las fotos cuando ya existe una', () => {
    render(
      <ProviderPhotoGallery
        providerId={7}
        images={[
          { id: 9, url: 'https://cdn.test/perfil.jpg', isCover: true },
        ]}
        allowEmptyUpload
      />,
    );

    expect(screen.queryByText('Subir foto')).not.toBeInTheDocument();
    const image = screen.getByAltText('Foto del proveedor 1');
    expect(image).toHaveAttribute('src', 'https://cdn.test/perfil.jpg');

    fireEvent.error(image);
    expect(screen.getByText('No disponible')).toBeInTheDocument();
  });
});
