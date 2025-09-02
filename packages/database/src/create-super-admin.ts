import { PrismaClient } from "../generated/prisma";
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import readline from 'readline';

const prisma = new PrismaClient();

async function createSuperAdminStandalone() {
    try {
        console.log('🔐 Royal Dusk - Super Admin Creation Tool\n');

        // Check if super admin already exists
        const existingSuperAdmin = await prisma.user.findFirst({
            where: { role: 'SUPER_ADMIN' }
        });

        if (existingSuperAdmin) {
            console.log('⚠️  Super Admin already exists:');
            console.log(`   Email: ${existingSuperAdmin.email}`);
            console.log(`   Created: ${existingSuperAdmin.createdAt}`);

            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const shouldContinue = await question(rl, 'Create another Super Admin? (y/N): ');
            rl.close();

            if (shouldContinue.toLowerCase() !== 'y') {
                console.log('✅ Operation cancelled.');
                return;
            }
        }

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        // Collect admin details
        const email = await question(rl, 'Enter Super Admin email: ');
        const name = await question(rl, 'Enter Super Admin name: ');
        const phone = await question(rl, 'Enter phone number (optional): ');
        const password = await question(rl, 'Enter strong password: ', true);

        // Validation
        if (!validateEmail(email)) {
            throw new Error('Invalid email format');
        }

        if (!name || name.trim().length < 2) {
            throw new Error('Name must be at least 2 characters');
        }

        if (!validatePassword(password)) {
            throw new Error('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create Super Admin
        const superAdmin = await prisma.user.create({
            data: {
                id: crypto.randomUUID(),
                email: email.toLowerCase().trim(),
                name: name.trim(),
                phone: phone.trim() || undefined,
                password: hashedPassword,
                role: 'SUPER_ADMIN',
                verified: true,
                profile_completed: true,
                two_factor_enabled: false,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        console.log('\n✅ Super Admin created successfully!');
        console.log(`📧 Email: ${superAdmin.email}`);
        console.log(`👤 Name: ${superAdmin.name}`);
        console.log(`🔑 Role: ${superAdmin.role}`);
        console.log(`📅 Created: ${superAdmin.createdAt}`);

        rl.close();
    } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Utility functions
function question(rl: readline.Interface, query: string, hidden: boolean = false): Promise<string> {
    return new Promise((resolve) => {
        if (hidden) {
            const stdin = process.stdin;
            stdin.setRawMode(true);
            stdin.resume();
            stdin.setEncoding('utf8');

            process.stdout.write(query);
            let password = '';

            const onData = (char: string) => {
                char = char.toString();

                if (char === '\n' || char === '\r' || char === '\u0004') {
                    stdin.setRawMode(false);
                    stdin.pause();
                    stdin.removeListener('data', onData);
                    process.stdout.write('\n');
                    resolve(password);
                } else if (char === '\u0003') {
                    process.exit();
                } else if (char === '\u007f') {
                    if (password.length > 0) {
                        password = password.slice(0, -1);
                        process.stdout.write('\b \b');
                    }
                } else {
                    password += char;
                    process.stdout.write('*');
                }
            };

            stdin.on('data', onData);
        } else {
            rl.question(query, resolve);
        }
    });
}

function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password: string): boolean {
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
}

// Run if called directly
if (require.main === module) {
    createSuperAdminStandalone()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

export { createSuperAdminStandalone };