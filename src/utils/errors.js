// utils/errors.js
export class ValidationError extends Error {
  constructor(message, field = null, value = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    this.code = 'VALIDATION_ERROR';
  }
}

export class PhysicsError extends Error {
  constructor(message, type = 'PHYSICS_VIOLATION') {
    super(message);
    this.name = 'PhysicsError';
    this.code = type;
  }
}

export class DataError extends Error {
  constructor(message, operation = null) {
    super(message);
    this.name = 'DataError';
    this.operation = operation;
    this.code = 'DATA_ERROR';
  }
}
