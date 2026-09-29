import * as tagService from '../services/tag.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const createTag = async (req, res, next) => {
  try {
    const tag = await tagService.createTag(req.user.id, req.body);
    res.status(201).json(new ApiResponse('Tag created successfully', { tag }));
  } catch (error) {
    next(error);
  }
};

export const listTags = async (req, res, next) => {
  try {
    const tags = await tagService.listTags(req.user.id);
    res.status(200).json(new ApiResponse('Tags fetched successfully', { tags, count: tags.length }));
  } catch (error) {
    next(error);
  }
};

export const getTag = async (req, res, next) => {
  try {
    const tag = await tagService.getTagById(req.params.id, req.user.id);
    res.status(200).json(new ApiResponse('Tag fetched successfully', { tag }));
  } catch (error) {
    next(error);
  }
};

export const updateTag = async (req, res, next) => {
  try {
    const tag = await tagService.updateTag(req.params.id, req.user.id, req.body);
    res.status(200).json(new ApiResponse('Tag updated successfully', { tag }));
  } catch (error) {
    next(error);
  }
};

export const deleteTag = async (req, res, next) => {
  try {
    await tagService.deleteTag(req.params.id, req.user.id);
    res.status(200).json(new ApiResponse('Tag deleted successfully', { id: req.params.id }));
  } catch (error) {
    next(error);
  }
};
