// src/routes/restApi.js
import express from 'express';
import { logger } from '../utils/logger.js';
import { ValidationError, PhysicsError, DataError } from '../utils/errors.js';

export function createRestApiRoutes(taskManager) {
  const router = express.Router();

  // Bodies endpoints
  router.get('/bodies', async (req, res) => {
    try {
      const bodies = taskManager.data.body || [];
      res.json({
        success: true,
        data: bodies,
        count: bodies.length
      });
    } catch (error) {
      logger.error('Bodies取得エラー', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/bodies', async (req, res) => {
    try {
      const { name, type, ...options } = req.body;
      const result = await taskManager.proposeBody(name, type, options);
      res.status(201).json({
        success: true,
        message: result,
        data: { name, type, ...options }
      });
    } catch (error) {
      return handleRestError(error, res);
    }
  });

  router.get('/bodies/:name', async (req, res) => {
    try {
      const { name } = req.params;
      const body = taskManager.findBodyByName(name);
      if (!body) {
        return res.status(404).json({
          success: false,
          error: `立体 ${name} が見つかりません`
        });
      }
      res.json({ success: true, data: body });
    } catch (error) {
      logger.error('Body取得エラー', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  });
  router.delete('/bodies/:name', async (req, res) => {
    try {
      const { name } = req.params;
      const result = await taskManager.deleteBody(name);
      res.json({
        success: true,
        message: result
      });
    } catch (error) {
      return handleRestError(error, res);
    }
  });

  // Zones endpoints
  router.get('/zones', async (req, res) => {
    try {
      const zones = taskManager.data.zone || [];
      res.json({
        success: true,
        data: zones,
        count: zones.length
      });
    } catch (error) {
      logger.error('Zones取得エラー', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/zones', async (req, res) => {
    try {
      const { body_name, material, density } = req.body;
      const result = await taskManager.proposeZone(body_name, material, density);
      res.status(201).json({
        success: true,
        message: result,
        data: { body_name, material, density }
      });
    } catch (error) {
      return handleRestError(error, res);
    }
  });

  router.delete('/zones/:bodyName', async (req, res) => {
    try {
      const { bodyName } = req.params;
      const result = await taskManager.deleteZone(bodyName);
      res.json({
        success: true,
        message: result
      });
    } catch (error) {
      return handleRestError(error, res);
    }
  });
  // Changes endpoints
  router.get('/changes', async (req, res) => {
    try {
      const changes = taskManager.pendingChanges;
      res.json({
        success: true,
        data: changes,
        count: changes.length
      });
    } catch (error) {
      logger.error('Changes取得エラー', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/changes/apply', async (req, res) => {
    try {
      const result = await taskManager.applyChanges();
      res.json({
        success: true,
        message: result
      });
    } catch (error) {
      return handleRestError(error, res);
    }
  });

  // Status endpoint
  router.get('/status', (req, res) => {
    res.json({
      success: true,
      data: {
        version: '2.0.0',
        status: 'running',
        bodies_count: taskManager.data.body?.length || 0,
        zones_count: taskManager.data.zone?.length || 0,
        pending_changes: taskManager.pendingChanges.length,
        uptime: process.uptime()
      }
    });
  });

  return router;
}

function handleRestError(error, res) {
  if (error instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: error.message,
      field: error.field,
      value: error.value
    });
  }
  
  if (error instanceof PhysicsError) {
    return res.status(422).json({
      success: false,
      error: error.message,
      type: error.code
    });
  }

  if (error instanceof DataError) {
    return res.status(500).json({
      success: false,
      error: error.message,
      operation: error.operation
    });
  }

  logger.error('REST APIエラー', { error: error.message });
  return res.status(500).json({
    success: false,
    error: 'サーバー内部エラー'
  });
}
