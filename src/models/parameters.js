export const getParameters = tableName => ({
  tableName: tableName,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt',
  timestamps: true,
  paranoid: true
});
