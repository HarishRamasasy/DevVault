import * as noteService from '../services/note.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const createNote = async (req, res, next) => {
  try {
    const note = await noteService.createNote(req.user.id, req.body);
    res.status(201).json(new ApiResponse('Note created successfully', { note }));
  } catch (error) {
    next(error);
  }
};

export const listNotes = async (req, res, next) => {
  try {
    const { notes, pagination } = await noteService.listNotes(req.user.id, req.query);
    res.status(200).json(new ApiResponse('Notes fetched successfully', { notes, count: notes.length, pagination }));
  } catch (error) {
    next(error);
  }
};

export const getNote = async (req, res, next) => {
  try {
    const note = await noteService.getNoteById(req.params.id, req.user.id);
    res.status(200).json(new ApiResponse('Note fetched successfully', { note }));
  } catch (error) {
    next(error);
  }
};

export const updateNote = async (req, res, next) => {
  try {
    const note = await noteService.updateNote(req.params.id, req.user.id, req.body);
    res.status(200).json(new ApiResponse('Note updated successfully', { note }));
  } catch (error) {
    next(error);
  }
};

export const deleteNote = async (req, res, next) => {
  try {
    await noteService.deleteNote(req.params.id, req.user.id);
    res.status(200).json(new ApiResponse('Note deleted successfully', { id: req.params.id }));
  } catch (error) {
    next(error);
  }
};

export const toggleFavorite = async (req, res, next) => {
  try {
    const note = await noteService.toggleFavorite(req.params.id, req.user.id);
    res.status(200).json(new ApiResponse('Note favorite status updated', { note }));
  } catch (error) {
    next(error);
  }
};
