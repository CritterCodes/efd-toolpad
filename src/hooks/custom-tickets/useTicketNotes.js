/**
 * Custom Ticket Notes Management Hook
 * Handles notes state and operations
 */

import { useState } from 'react';

export function useTicketNotes(ticket, onTicketUpdate) {
  const [newNote, setNewNote] = useState('');
  const [noteModal, setNoteModal] = useState({ open: false });
  const [saving, setSaving] = useState(false);

  const openNoteModal = () => {
    setNoteModal({ open: true });
    setNewNote('');
  };

  const closeNoteModal = () => {
    setNoteModal({ open: false });
    setNewNote('');
  };

  const addNote = async () => {
    if (!newNote.trim() || !ticket) return;

    try {
      setSaving(true);
      
      const updatedNotes = [
        ...(ticket.notes || []),
        {
          id: Date.now(),
          text: newNote.trim(),
          author: 'Current User', // Replace with actual user
          timestamp: new Date().toISOString(),
          type: 'internal'
        }
      ];

      const result = await onTicketUpdate({ notes: updatedNotes });
      
      if (result.success) {
        closeNoteModal();
      }
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (noteId) => {
    if (!ticket || !ticket.notes) return;

    try {
      setSaving(true);
      
      const updatedNotes = ticket.notes.filter(note => note.id !== noteId);
      await onTicketUpdate({ notes: updatedNotes });
    } catch (error) {
      console.error('Error deleting note:', error);
    } finally {
      setSaving(false);
    }
  };

  return {
    newNote,
    setNewNote,
    noteModal,
    saving,
    openNoteModal,
    closeNoteModal,
    addNote,
    deleteNote,
    notesCount: ticket?.notes?.length || 0
  };
}

export default useTicketNotes;