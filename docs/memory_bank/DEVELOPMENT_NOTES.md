# Workout Tracker - Development Notes

This document contains development notes, common issues, and their solutions for the Workout Tracker application.

## Development Environment

### Docker Container Issues

#### Editing Files While Containers Are Running

**Issue**: When editing files that are mounted as volumes in a Docker container while the container is running, permission conflicts can occur, making it difficult to stop or restart the containers.

**Symptoms**:
- "Permission denied" errors when trying to stop/restart containers
- Container restart failures after code changes

**Causes**:
- Container processes running as different users than the host user
- File locks held by processes inside the container
- Modified file ownership/permissions by the container

**Solutions**:
1. Force stop the containers:
   ```bash
   sudo docker compose kill
   ```

2. Remove the containers:
   ```bash
   sudo docker compose rm -f
   ```

3. Start the containers again:
   ```bash
   sudo docker compose up -d
   ```

4. If the above doesn't work, a system reboot may be necessary to clear lingering file locks.

## Frontend Development

### Missing React Components

**Issue**: When implementing new components that reference other custom components, errors can occur if those dependencies haven't been created yet.

**Solution**: Ensure all component dependencies are created before using them, or create missing components when errors occur.

### API Error Handling

The application uses a centralized error handling approach with the `handleApiError` utility function. This function:

1. Extracts error messages from API responses
2. Provides consistent formatting
3. Optionally updates error state in components

If extending API endpoints, ensure proper error handling by using this utility:

```javascript
import { handleApiError } from '../utils/api';

try {
  // API call
} catch (error) {
  const errorMessage = handleApiError(error, setError, 'Default message');
  // Handle error
}
```

## Dependency Management

### Adding New Dependencies

When adding new dependencies to the frontend:

1. Install the dependency in the Docker container:
   ```bash
   docker compose exec frontend npm install [package-name] --save
   ```

2. Rebuild the frontend container if needed:
   ```bash
   docker compose up -d --build frontend
   ```

3. Update the IMPLEMENTATION_SUMMARY.md file to document the new dependency.

## Troubleshooting Checklist

When encountering issues with the application:

1. Check browser console for JavaScript errors
2. Examine Docker container logs:
   ```bash
   docker compose logs frontend
   docker compose logs backend
   ```

3. Verify API endpoints using the browser's network tab or a tool like Postman
4. Check for missing dependencies in package.json
5. Ensure all required components and utilities are properly exported/imported

## Code Organization

To maintain code quality and consistency:

1. Follow the established component structure
2. Use Material UI components for UI elements
3. Implement proper loading and error states
4. Ensure responsive design for all components
5. Document significant changes in the memory bank 