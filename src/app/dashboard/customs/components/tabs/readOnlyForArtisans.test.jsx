// @vitest-environment jsdom
//
// A control that can only fail is worse than no control.
//
// `POST`/`DELETE .../notes` and `.../images` are staff-only, and both tabs rendered their add and delete
// controls to everyone — so for an assigned artisan, the one visible thing to do on either tab produced a
// 403 and a red toast. They can read both, which is the half they need; what they could not do, the screen
// should not offer.
//
// `canEdit` defaults to true so every existing caller is unchanged; the customs detail page passes
// `isStaff(session)`.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import NotesTab from './NotesTab';
import ImagesTab from './ImagesTab';

const notes = [{ id: 'n1', text: 'Client approved the shoulder taper', author: 'Jacob', type: 'internal', createdAt: '2026-10-02T10:00:00Z' }];
const images = [{ id: 'i1', url: 'https://example.test/a.jpg', caption: 'Inspiration' }];

const showNotes = (canEdit) => render(
  <NotesTab customID="CO-1" notes={notes} onChanged={vi.fn()} notify={vi.fn()} canEdit={canEdit} />,
);
const showImages = (canEdit) => render(
  <ImagesTab customID="CO-1" images={images} onChanged={vi.fn()} notify={vi.fn()} canEdit={canEdit} />,
);

afterEach(cleanup);

describe('notes and images for someone who may only read them', () => {
  it('offers no Add Note', () => {
    showNotes(false);
    expect(screen.queryByRole('button', { name: /add note/i })).not.toBeInTheDocument();
  });

  it('offers no Upload', () => {
    showImages(false);
    expect(screen.queryByRole('button', { name: /upload/i })).not.toBeInTheDocument();
  });

  it('still shows the notes and the moodboard, which is the half they need', () => {
    showNotes(false);
    expect(screen.getByText('Client approved the shoulder taper')).toBeInTheDocument();
    cleanup();
    showImages(false);
    expect(screen.getByRole('img', { name: 'Inspiration' })).toBeInTheDocument();
  });

  it('does not word the empty moodboard as an instruction to upload', () => {
    render(<ImagesTab customID="CO-1" images={[]} onChanged={vi.fn()} notify={vi.fn()} canEdit={false} />);
    expect(screen.getByText(/No reference images on this order yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/Upload moodboard/i)).not.toBeInTheDocument();
  });
});

describe('the same tabs for staff', () => {
  it('still offer Add Note and Upload', () => {
    showNotes(true);
    expect(screen.getByRole('button', { name: /add note/i })).toBeInTheDocument();
    cleanup();
    showImages(true);
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
  });

  it('default to editable, so no existing caller changed behaviour', () => {
    // Both tabs are rendered elsewhere without the prop; omitting it must mean "staff", not "locked".
    render(<NotesTab customID="CO-1" notes={notes} onChanged={vi.fn()} notify={vi.fn()} />);
    expect(screen.getByRole('button', { name: /add note/i })).toBeInTheDocument();
  });
});
