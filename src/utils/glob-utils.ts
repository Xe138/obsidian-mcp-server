/**
 * Glob pattern matching utilities for filtering files and folders
 * Supports *, **, ?, and negation patterns
 */

export class GlobUtils {
	/**
	 * Convert a glob pattern to a regular expression
	 * Supports:
	 * - * matches any characters except /
	 * - ** matches any characters including /
	 * - ? matches a single character except /
	 * - [abc] matches any character in the set
	 * - {a,b} matches any of the alternatives
	 */
	private static globToRegex(pattern: string): RegExp {
		let regexStr = '^';
		let i = 0;
		
		while (i < pattern.length) {
			const char = pattern[i];
			
			switch (char) {
				case '*':
					// Check for **
					if (pattern[i + 1] === '*') {
						// ** matches everything including /
						regexStr += '.*';
						i += 2;
						// Skip optional trailing /
						if (pattern[i] === '/') {
							regexStr += '/?';
							i++;
						}
					} else {
						// * matches anything except /
						regexStr += '[^/]*';
						i++;
					}
					break;
				
				case '?':
					// ? matches a single character except /
					regexStr += '[^/]';
					i++;
					break;
				
				case '[': {
					// Character class
					const closeIdx = pattern.indexOf(']', i);
					if (closeIdx === -1) {
						// No closing bracket, treat as literal
						regexStr += '\\[';
						i++;
					} else {
						regexStr += '[' + pattern.substring(i + 1, closeIdx) + ']';
						i = closeIdx + 1;
					}
					break;
				}

				case '{': {
					// Alternatives {a,b,c}
					const closeIdx2 = pattern.indexOf('}', i);
					if (closeIdx2 === -1) {
						// No closing brace, treat as literal
						regexStr += '\\{';
						i++;
					} else {
						const alternatives = pattern.substring(i + 1, closeIdx2).split(',');
						regexStr += '(' + alternatives.map(alt =>
							this.escapeRegex(alt)
						).join('|') + ')';
						i = closeIdx2 + 1;
					}
					break;
				}

				case '/':
				case '.':
				case '(':
				case ')':
				case '+':
				case '^':
				case '$':
				case '|':
				case '\\':
					// Escape special regex characters
					regexStr += '\\' + char;
					i++;
					break;
				
				default:
					regexStr += char;
					i++;
			}
		}
		
		regexStr += '$';
		return new RegExp(regexStr);
	}
	
	private static escapeRegex(str: string): string {
		return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}
	
	/**
	 * Check if a path matches a glob pattern
	 */
	static matches(path: string, pattern: string): boolean {
		const regex = this.globToRegex(pattern);
		return regex.test(path);
	}
	
	/**
	 * Check if a path matches any of the include patterns
	 * If no includes are specified, returns true
	 */
	static matchesIncludes(path: string, includes?: string[]): boolean {
		if (!includes || includes.length === 0) {
			return true;
		}
		
		return includes.some(pattern => this.matches(path, pattern));
	}
	
	/**
	 * Check if a path matches any of the exclude patterns
	 * If no excludes are specified, returns false
	 */
	static matchesExcludes(path: string, excludes?: string[]): boolean {
		if (!excludes || excludes.length === 0) {
			return false;
		}
		
		return excludes.some(pattern => this.matches(path, pattern));
	}
	
	/**
	 * Check if a path should be included based on include and exclude patterns
	 * Returns true if the path matches includes and doesn't match excludes
	 */
	static shouldInclude(path: string, includes?: string[], excludes?: string[]): boolean {
		// Must match includes (if specified)
		if (!this.matchesIncludes(path, includes)) {
			return false;
		}
		
		// Must not match excludes (if specified)
		if (this.matchesExcludes(path, excludes)) {
			return false;
		}
		
		return true;
	}
}
