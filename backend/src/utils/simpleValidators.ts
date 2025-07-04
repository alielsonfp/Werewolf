// 🐺 LOBISOMEM ONLINE - Simple Validators for Initial Testing
// Versão simplificada para evitar erros de compilação

export interface ValidationResult {
    success: boolean;
    data?: any;
    error?: string;
}

// Simple email validation
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Simple username validation
export function validateUsername(username: string): boolean {
    return username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9_-]+$/.test(username);
}

// Simple password validation
export function validatePassword(password: string): boolean {
    return password.length >= 6 && password.length <= 50;
}

// Simple room name validation  
export function validateRoomName(name: string): boolean {
    return name.length >= 1 && name.length <= 30;
}

// Simple room code validation
export function validateRoomCode(code: string): boolean {
    return /^\d{6}$/.test(code);
}

// WebSocket message validation
export function validateWebSocketMessage(message: any): ValidationResult {
    if (!message || typeof message !== 'object') {
        return {
            success: false,
            error: 'Message must be an object'
        };
    }

    if (!message.type || typeof message.type !== 'string') {
        return {
            success: false,
            error: 'Message must have a valid type'
        };
    }

    return {
        success: true,
        data: {
            type: message.type,
            data: message.data || {},
            timestamp: message.timestamp || new Date().toISOString(),
            messageId: message.messageId
        }
    };
}

// Simple register validation
export function validateRegisterRequest(data: any): ValidationResult {
    if (!data.email || !validateEmail(data.email)) {
        return { success: false, error: 'Invalid email' };
    }

    if (!data.username || !validateUsername(data.username)) {
        return { success: false, error: 'Invalid username' };
    }

    if (!data.password || !validatePassword(data.password)) {
        return { success: false, error: 'Invalid password' };
    }

    if (data.password !== data.confirmPassword) {
        return { success: false, error: 'Passwords do not match' };
    }

    return {
        success: true,
        data: {
            email: data.email.toLowerCase().trim(),
            username: data.username.trim(),
            password: data.password
        }
    };
}

// Simple login validation
export function validateLoginRequest(data: any): ValidationResult {
    if (!data.email || !validateEmail(data.email)) {
        return { success: false, error: 'Invalid email' };
    }

    if (!data.password || typeof data.password !== 'string') {
        return { success: false, error: 'Invalid password' };
    }

    return {
        success: true,
        data: {
            email: data.email.toLowerCase().trim(),
            password: data.password
        }
    };
}

// Simple create room validation
export function validateCreateRoomRequest(data: any): ValidationResult {
    if (!data.name || !validateRoomName(data.name)) {
        return { success: false, error: 'Invalid room name' };
    }

    return {
        success: true,
        data: {
            name: data.name.trim(),
            isPrivate: Boolean(data.isPrivate),
            maxPlayers: Math.min(Math.max(data.maxPlayers || 15, 6), 15),
            maxSpectators: Math.min(Math.max(data.maxSpectators || 5, 0), 5)
        }
    };
}