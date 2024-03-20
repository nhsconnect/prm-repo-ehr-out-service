/**
 * @deprecated
 * to be deleted in PRMT-4588
 */
const getParameters = tableName => ({
  tableName: tableName,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt',
  timestamps: true,
  paranoid: true
});
