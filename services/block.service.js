const blockRepository = require('../repositories/block.repository.js');
const TILE_SIZE = 100;

exports.listBlocks = async () => {
  return await blockRepository.getBlocksWithOwners();
}

exports.listBlocksByTile = async (tileX, tileY) => {
  const minX = tileX * TILE_SIZE;
  const maxX = (parseInt(tileX) + 1) * TILE_SIZE - 1;
  const minY = tileY * TILE_SIZE;
  const maxY = (parseInt(tileY) + 1) * TILE_SIZE - 1;
  const result = await blockRepository.getBlocksWithOwnersByTile(minX, maxX, minY, maxY);
  if (result.length > 0) {
    console.log('>>> result: ', result.length);
  }
  return result;
}