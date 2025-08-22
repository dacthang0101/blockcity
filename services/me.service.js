const userRepository = require('../repositories/user.repository.js');
const AppError = require('../utils/app_error.js');
const ErrorCodes = require('../utils/error_codes.js');

exports.getUserById = async (userId) => {
  const user = await userRepository.findProfileById(userId);
  if (!user) {
    throw new AppError('User was not found', { code: ErrorCodes.USER_NOT_FOUND });
  }
  return user;
}