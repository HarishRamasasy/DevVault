import * as snippetService from '../services/snippet.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const createSnippet = async (req, res, next) => {
  try {
    const snippet = await snippetService.createSnippet(req.user.id, req.body);
    res.status(201).json(new ApiResponse('Snippet created successfully', { snippet }));
  } catch (error) {
    next(error);
  }
};

export const listSnippets = async (req, res, next) => {
  try {
    const { snippets, pagination } = await snippetService.listSnippets(req.user.id, req.query);
    res
      .status(200)
      .json(new ApiResponse('Snippets fetched successfully', { snippets, count: snippets.length, pagination }));
  } catch (error) {
    next(error);
  }
};

export const getSnippet = async (req, res, next) => {
  try {
    const snippet = await snippetService.getSnippetById(req.params.id, req.user.id);
    res.status(200).json(new ApiResponse('Snippet fetched successfully', { snippet }));
  } catch (error) {
    next(error);
  }
};

export const updateSnippet = async (req, res, next) => {
  try {
    const snippet = await snippetService.updateSnippet(req.params.id, req.user.id, req.body);
    res.status(200).json(new ApiResponse('Snippet updated successfully', { snippet }));
  } catch (error) {
    next(error);
  }
};

export const deleteSnippet = async (req, res, next) => {
  try {
    await snippetService.deleteSnippet(req.params.id, req.user.id);
    res.status(200).json(new ApiResponse('Snippet deleted successfully', { id: req.params.id }));
  } catch (error) {
    next(error);
  }
};

export const toggleFavorite = async (req, res, next) => {
  try {
    const snippet = await snippetService.toggleFavorite(req.params.id, req.user.id);
    res.status(200).json(new ApiResponse('Snippet favorite status updated', { snippet }));
  } catch (error) {
    next(error);
  }
};
