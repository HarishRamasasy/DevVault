import * as folderService from '../services/folder.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const createFolder = async (req, res, next) => {
  try {
    const folder = await folderService.createFolder(req.user.id, req.body);
    res.status(201).json(new ApiResponse('Folder created successfully', { folder }));
  } catch (error) {
    next(error);
  }
};

export const listFolders = async (req, res, next) => {
  try {
    const folders = await folderService.listFolders(req.user.id);
    res.status(200).json(new ApiResponse('Folders fetched successfully', { folders, count: folders.length }));
  } catch (error) {
    next(error);
  }
};

export const getFolder = async (req, res, next) => {
  try {
    const folder = await folderService.getFolderById(req.params.id, req.user.id);
    res.status(200).json(new ApiResponse('Folder fetched successfully', { folder }));
  } catch (error) {
    next(error);
  }
};

export const updateFolder = async (req, res, next) => {
  try {
    const folder = await folderService.updateFolder(req.params.id, req.user.id, req.body);
    res.status(200).json(new ApiResponse('Folder updated successfully', { folder }));
  } catch (error) {
    next(error);
  }
};

export const deleteFolder = async (req, res, next) => {
  try {
    await folderService.deleteFolder(req.params.id, req.user.id);
    res.status(200).json(new ApiResponse('Folder deleted successfully', { id: req.params.id }));
  } catch (error) {
    next(error);
  }
};
