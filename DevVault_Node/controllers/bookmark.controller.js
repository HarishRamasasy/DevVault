import * as bookmarkService from '../services/bookmark.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const createBookmark = async (req, res, next) => {
  try {
    const bookmark = await bookmarkService.createBookmark(req.user.id, req.body);
    res.status(201).json(new ApiResponse('Bookmark created successfully', { bookmark }));
  } catch (error) {
    next(error);
  }
};

export const listBookmarks = async (req, res, next) => {
  try {
    const bookmarks = await bookmarkService.listBookmarks(req.user.id, req.query);
    res.status(200).json(new ApiResponse('Bookmarks fetched successfully', { bookmarks, count: bookmarks.length }));
  } catch (error) {
    next(error);
  }
};

export const getBookmark = async (req, res, next) => {
  try {
    const bookmark = await bookmarkService.getBookmarkById(req.params.id, req.user.id);
    res.status(200).json(new ApiResponse('Bookmark fetched successfully', { bookmark }));
  } catch (error) {
    next(error);
  }
};

export const updateBookmark = async (req, res, next) => {
  try {
    const bookmark = await bookmarkService.updateBookmark(req.params.id, req.user.id, req.body);
    res.status(200).json(new ApiResponse('Bookmark updated successfully', { bookmark }));
  } catch (error) {
    next(error);
  }
};

export const deleteBookmark = async (req, res, next) => {
  try {
    await bookmarkService.deleteBookmark(req.params.id, req.user.id);
    res.status(200).json(new ApiResponse('Bookmark deleted successfully', { id: req.params.id }));
  } catch (error) {
    next(error);
  }
};

export const toggleFavorite = async (req, res, next) => {
  try {
    const bookmark = await bookmarkService.toggleFavorite(req.params.id, req.user.id);
    res.status(200).json(new ApiResponse('Bookmark favorite status updated', { bookmark }));
  } catch (error) {
    next(error);
  }
};
