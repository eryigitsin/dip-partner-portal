#!/bin/bash

#Dosya Yükleme Güvenliği Önerileri

// ❌ GÜVENSİZ
app.post('/upload', (req, res) => {
	const file = req.files.file;
	file.mv('./uploads/' + file.name);
});

// ✅ GÜVENLİ
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const storage = multer.diskStorage({
	destination: './uploads/',
	filename: (req, file, cb) => {
		const uniqueName = crypto.randomBytes(16).toString('hex');
		const ext = path.extname(file.originalname).toLowerCase();
		
		// Dosya tipi kontrolü
		const allowedExts = ['.jpg', '.jpeg', '.png', '.pdf'];
		if (!allowedExts.includes(ext)) {
			return cb(new Error('Invalid file type'));
		}
			
			cb(null, uniqueName + ext);
			}
			});
			
			const upload = multer({ 
				storage,
				limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
				fileFilter: (req, file, cb) => {
					const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
					if (allowedMimeTypes.includes(file.mimetype)) {
						cb(null, true);
					} else {
						cb(new Error('Invalid file type'));
					}
						}
						});
						
#REACT CONTEXT GÜVENLİĞİ ÖNERİLERİ:
	
						// contexts/AuthContext.js - Güvenli implementasyon
						import { createContext, useContext, useState, useEffect } from 'react';
						import jwt from 'jsonwebtoken';
						
						const AuthContext = createContext();
						
						export const AuthProvider = ({ children }) => {
							const [user, setUser] = useState(null);
							const [loading, setLoading] = useState(true);
							
							useEffect(() => {
		const token = localStorage.getItem('token');
		if (token) {
			try {
				const decoded = jwt.decode(token);
				// Token süre kontrolü
				if (decoded.exp * 1000 < Date.now()) {
								localStorage.removeItem('token');
								setUser(null);
							} else {
								setUser(decoded);
							}
						} catch (error) {
							localStorage.removeItem('token');
						}
						}
						setLoading(false);
						}, []);
						
						const login = async (credentials) => {
							try {
								const response = await fetch('/api/auth/login', {
									method: 'POST',
									headers: { 'Content-Type': 'application/json' },
									body: JSON.stringify(credentials)
								});
								
								if (!response.ok) throw new Error('Login failed');
									
									const { token, user } = await response.json();
									
									// XSS koruması için httpOnly cookie kullanın
									document.cookie = `token=${token}; path=/; httpOnly; secure; sameSite=strict`;
									
									setUser(user);
									return { success: true };
									} catch (error) {
										return { success: false, error: error.message };
									}
									};
									
									return (
										<AuthContext.Provider value={{ user, login, loading }}>
										{children}
										</AuthContext.Provider>
									);
									};
									
#E-MAIL TEMPLATE GÜVENLİĞİ:

									// Email template injection koruması
									const sanitizeHtml = require('sanitize-html');
									const nodemailer = require('nodemailer');
									
									const sendEmail = async (to, subject, template, data) => {
										// HTML sanitization
										const sanitizedData = {};
										for (const [key, value] of Object.entries(data)) {
											sanitizedData[key] = sanitizeHtml(value, {
												allowedTags: [],
												allowedAttributes: {}
											});
										}
											
											// Template rendering
											const html = renderTemplate(template, sanitizedData);
											
											// Rate limiting kontrolü
											const emailCount = await getEmailCount(to, '24h');
											if (emailCount > 10) {
												throw new Error('Email rate limit exceeded');
											}
												
												// Email gönderimi
												await transporter.sendMail({
													from: process.env.EMAIL_FROM,
													to,
													subject,
													html
												});
												};
												
#SERVER GÜVENLİK YAPISI:

												// server/index.js - Önerilen güvenlik yapılandırması
												const express = require('express');
												const helmet = require('helmet');
												const cors = require('cors');
												const rateLimit = require('express-rate-limit');
												const mongoSanitize = require('express-mongo-sanitize');
												const xss = require('xss-clean');
												const hpp = require('hpp');
												const compression = require('compression');
												
												const app = express();
												
												// Güvenlik middleware'leri
app.use(helmet({
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			styleSrc: ["'self'", "'unsafe-inline'"],
			scriptSrc: ["'self'"],
			imgSrc: ["'self'", "data:", "https:"],
		},
	},
}));

// CORS yapılandırması
app.use(cors({
	origin: process.env.CLIENT_URL || 'http://localhost:3000',
	credentials: true
}));

// Rate limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 dakika
	max: 100, // maksimum 100 istek
	message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Daha sıkı rate limit for auth endpoints
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 5,
	skipSuccessfulRequests: true
});
app.use('/api/auth/', authLimiter);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// NoSQL injection koruması
app.use(mongoSanitize());

// XSS koruması
app.use(xss());

// HTTP Parameter Pollution koruması
app.use(hpp());

// Compression
app.use(compression());

// Request logging
const morgan = require('morgan');
const winston = require('winston');

const logger = winston.createLogger({
	level: 'info',
	format: winston.format.json(),
	transports: [
		new winston.transports.File({ filename: 'error.log', level: 'error' }),
		new winston.transports.File({ filename: 'combined.log' })
	]
});

app.use(morgan('combined', { stream: logger.stream }));

#CLIENT (REACT) GÜVENLİK ÖNERİLERİ

// components/SecureInput.js - XSS korumalı input
import DOMPurify from 'dompurify';
import { useState } from 'react';

const SecureInput = ({ value, onChange, ...props }) => {
	const [error, setError] = useState('');
	
	const handleChange = (e) => {
		const cleanValue = DOMPurify.sanitize(e.target.value);
		
		// SQL injection pattern kontrolü
		const sqlPattern = /(DROP|DELETE|INSERT|UPDATE|SELECT)\s/i;
		if (sqlPattern.test(cleanValue)) {
			setError('Invalid input detected');
			return;
		}
		
		setError('');
		onChange(cleanValue);
	};
	
	return (
		<>
			<input {...props} value={value} onChange={handleChange} />
			{error && <span className="error">{error}</span>}
		</>
	);
};

