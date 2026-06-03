export const requirePermission = (permissionName) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "User not authenticated"
      });
    }

    const permissions = req.user.permissions || [];

    if (!permissions.includes(permissionName)) {
      return res.status(403).json({
        error: "Forbidden. Missing permission."
      });
    }

    next();
  };
};