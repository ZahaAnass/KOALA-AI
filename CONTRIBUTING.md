# Contributing to KOALA AI

First off, thank you for considering contributing to KOALA AI! It's people like you that make KOALA AI such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps to reproduce the problem**
* **Provide specific examples to demonstrate the steps**
* **Describe the behavior you observed and what behavior you expected**
* **Include screenshots if possible**
* **Include your environment details** (OS, Node.js version, browser, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title**
* **Provide a detailed description of the suggested enhancement**
* **Explain why this enhancement would be useful**
* **List any alternative solutions or features you've considered**

### Pull Requests

* Fill in the required template
* Follow the coding style guidelines
* Include appropriate test coverage
* Update documentation as needed
* End all files with a newline

## Development Setup

1. Fork the repo and clone your fork
2. Install dependencies:
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```
3. Create a `.env` file in both `client` and `server` directories (see README.md)
4. Create a branch: `git checkout -b my-feature-branch`
5. Make your changes
6. Test your changes
7. Commit your changes: `git commit -m 'Add some feature'`
8. Push to your fork: `git push origin my-feature-branch`
9. Submit a pull request

## Coding Style

### JavaScript/TypeScript

* Use ES6+ features
* Use TypeScript for server-side code
* Follow ESLint rules (run `npm run lint`)
* Use meaningful variable and function names
* Add comments for complex logic
* Keep functions small and focused

### React

* Use functional components with hooks
* Keep components small and reusable
* Use proper prop validation
* Follow React best practices
* Use TailwindCSS for styling

### Git Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line

Example:
```
Add image upload validation

- Validate file size (max 5MB)
- Check file type (only jpg, png, gif)
- Show error messages to user

Fixes #123
```

## Project Structure

```
KOALA-AI/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── layouts/     # Layout components
│   │   ├── routes/      # Page components
│   │   └── lib/         # Utilities and libraries
│   └── public/          # Static assets
├── server/              # Express backend
│   ├── controllers/     # Request handlers
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   └── utils/           # Utility functions
└── docs/                # Documentation
```

## Testing

* Write tests for new features
* Ensure all tests pass before submitting PR
* Aim for good test coverage

```bash
# Run tests (when implemented)
npm test
```

## Documentation

* Update README.md if you change functionality
* Comment your code where necessary
* Update API documentation for API changes
* Add JSDoc comments for functions

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

## Recognition

Contributors will be recognized in our README.md file and release notes.

Thank you for contributing! 🎉
