# Contributing to CFP Directory Self-Hosted

Thank you for your interest in contributing to CFP Directory Self-Hosted! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Be kind and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js 20 or later
- PostgreSQL 15 or later (or Docker)
- Git

### Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/cfp-directory-self-hosted.git
   cd cfp-directory-self-hosted
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Set up the database**
   
   Using Docker (recommended):
   ```bash
   docker compose -f docker/docker-compose.yml up db -d
   ```
   
   Or configure your local PostgreSQL in `.env`

5. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

6. **Run database migrations**
   ```bash
   npx prisma migrate dev
   ```

7. **Start the development server**
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names:
- `feature/add-speaker-profile` - New features
- `fix/login-redirect-issue` - Bug fixes
- `docs/update-readme` - Documentation
- `refactor/auth-module` - Code refactoring

### Making Changes

1. **Create a branch** from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the code style guidelines

3. **Write tests** for new functionality

4. **Run tests** to ensure nothing is broken
   ```bash
   npm test
   ```

5. **Run the linter**
   ```bash
   npm run lint
   ```

6. **Commit your changes** with a clear message
   ```bash
   git commit -m "Add speaker profile page with bio and social links"
   ```

### Commit Messages

Write clear, concise commit messages:

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit first line to 72 characters
- Reference issues when applicable ("Fix #123")

Good examples:
- `Add email notification for submission status changes`
- `Fix redirect loop on login page`
- `Update README with Docker instructions`
- `Refactor auth middleware for better error handling`

### Pull Requests

1. **Push your branch** to your fork
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** against `main`

3. **Fill out the PR template** with:
   - Description of changes
   - Related issues
   - Testing performed
   - Screenshots (for UI changes)

4. **Wait for review** - maintainers will review and provide feedback

5. **Address feedback** by pushing additional commits

## Code Style

### TypeScript

- Use TypeScript for all new code
- Define proper types (avoid `any`)
- Use interfaces for object shapes
- Export types that may be used elsewhere

```typescript
// Good
interface Event {
  id: string;
  name: string;
  startDate: Date | null;
}

// Avoid
const event: any = { ... };
```

### React Components

- Use functional components with hooks
- Use Server Components by default, Client Components when needed
- Keep components focused and composable
- Use proper prop types

```typescript
// Good
interface EventCardProps {
  event: Event;
  onSelect?: (id: string) => void;
}

export function EventCard({ event, onSelect }: EventCardProps) {
  return (
    // ...
  );
}
```

### File Organization

```
src/
├── app/           # Next.js pages and API routes
├── components/    # Reusable UI components
│   ├── ui/        # Base UI components (shadcn)
│   └── [feature]/ # Feature-specific components
├── lib/           # Utilities and services
│   ├── auth/      # Authentication
│   ├── db/        # Database utilities
│   └── validations/ # Zod schemas
└── hooks/         # Custom React hooks
```

### Naming Conventions

- **Files:** kebab-case (`event-card.tsx`)
- **Components:** PascalCase (`EventCard`)
- **Functions:** camelCase (`getEventById`)
- **Constants:** SCREAMING_SNAKE_CASE (`MAX_FILE_SIZE`)
- **Types/Interfaces:** PascalCase (`EventFormData`)

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm run test:coverage
```

### Writing Tests

- Place tests in `src/__tests__/`
- Mirror the source file structure
- Test both success and error cases
- Use meaningful test descriptions

```typescript
describe('createEvent', () => {
  it('should create an event with valid data', async () => {
    // ...
  });

  it('should reject invalid event data', async () => {
    // ...
  });
});
```

## Database Changes

### Migrations

When changing the database schema:

1. Modify `prisma/schema.prisma`
2. Create a migration:
   ```bash
   npx prisma migrate dev --name describe_your_change
   ```
3. Include the migration file in your PR

### Guidelines

- Never modify existing migrations
- Use descriptive migration names
- Add indexes for frequently queried fields
- Consider data migration for existing records

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public functions
- Update inline comments for complex logic
- Create/update API documentation for endpoint changes

## Reporting Issues

### Bug Reports

Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, Node version, etc.)
- Screenshots/logs if applicable

### Feature Requests

Include:
- Clear description of the feature
- Use case / problem it solves
- Proposed implementation (if any)
- Alternatives considered

## Getting Help

- **GitHub Issues:** For bugs and feature requests
- **GitHub Discussions:** For questions and ideas
- **Discord:** For real-time chat (link in README)

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.

---

Thank you for contributing to CFP Directory Self-Hosted!
