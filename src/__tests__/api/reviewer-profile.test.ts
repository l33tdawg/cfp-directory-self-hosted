/**
 * Reviewer Profile API Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PATCH } from '@/app/api/reviewer-profile/route';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    reviewerProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

const mockAuth = vi.mocked(auth);
const mockPrisma = vi.mocked(prisma);

const mockReviewerProfile = {
  id: 'profile-1',
  userId: 'user-1',
  fullName: 'John Doe',
  designation: 'Senior Engineer',
  company: 'Acme Inc',
  bio: 'I am a software engineer with over 10 years of experience in building web applications.',
  photoUrl: null,
  linkedinUrl: 'https://linkedin.com/in/johndoe',
  twitterHandle: 'johndoe',
  githubUsername: 'johndoe',
  websiteUrl: 'https://johndoe.com',
  hasReviewedBefore: true,
  conferencesReviewed: 'JSConf, React Summit',
  expertiseAreas: ['Frontend Development', 'Backend Development'],
  yearsOfExperience: 10,
  reviewCriteria: ['technical_depth', 'practical_value'],
  additionalNotes: 'I focus on code quality',
  hoursPerWeek: '5-10',
  preferredEventSize: 'large',
  showOnTeamPage: true,
  displayOrder: 0,
  onboardingCompleted: true,
  onboardingStep: 4,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Reviewer Profile API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/reviewer-profile', () => {
    it('returns 401 if not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);
      
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns profile if exists', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', email: 'test@example.com' },
        expires: new Date().toISOString(),
      });
      mockPrisma.reviewerProfile.findUnique.mockResolvedValueOnce(mockReviewerProfile);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile.id).toBe(mockReviewerProfile.id);
      expect(data.profile.fullName).toBe(mockReviewerProfile.fullName);
      expect(data.profile.bio).toBe(mockReviewerProfile.bio);
    });

    it('returns null profile if not exists', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', email: 'test@example.com' },
        expires: new Date().toISOString(),
      });
      mockPrisma.reviewerProfile.findUnique.mockResolvedValueOnce(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile).toBeNull();
    });
  });

  describe('POST /api/reviewer-profile', () => {
    const validProfileData = {
      fullName: 'Jane Doe',
      designation: 'Tech Lead',
      company: 'Tech Corp',
      bio: 'I am a tech lead with extensive experience in software architecture and team leadership.',
      linkedinUrl: 'https://linkedin.com/in/janedoe',
      twitterHandle: '@janedoe',
      githubUsername: 'janedoe',
      websiteUrl: 'https://janedoe.dev',
      hasReviewedBefore: true,
      conferencesReviewed: 'ReactConf',
      expertiseAreas: ['System Architecture', 'DevOps & Infrastructure'],
      yearsOfExperience: 15,
      reviewCriteria: ['technical_depth', 'innovation'],
      additionalNotes: '',
      hoursPerWeek: '2-5',
      preferredEventSize: 'medium',
    };

    it('returns 401 if not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost/api/reviewer-profile', {
        method: 'POST',
        body: JSON.stringify(validProfileData),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('returns 400 if profile already exists', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', email: 'test@example.com' },
        expires: new Date().toISOString(),
      });
      mockPrisma.reviewerProfile.findUnique.mockResolvedValueOnce(mockReviewerProfile);

      const request = new NextRequest('http://localhost/api/reviewer-profile', {
        method: 'POST',
        body: JSON.stringify(validProfileData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Reviewer profile already exists');
    });

    it('creates profile successfully', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-2', email: 'new@example.com' },
        expires: new Date().toISOString(),
      });
      mockPrisma.reviewerProfile.findUnique.mockResolvedValueOnce(null);
      mockPrisma.reviewerProfile.create.mockResolvedValueOnce({
        ...mockReviewerProfile,
        id: 'profile-2',
        userId: 'user-2',
        ...validProfileData,
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce({ role: 'USER' });
      mockPrisma.user.update.mockResolvedValueOnce({ id: 'user-2', role: 'REVIEWER' });

      const request = new NextRequest('http://localhost/api/reviewer-profile', {
        method: 'POST',
        body: JSON.stringify(validProfileData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe('Reviewer profile created successfully');
    });
  });

  describe('PATCH /api/reviewer-profile', () => {
    it('returns 401 if not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost/api/reviewer-profile', {
        method: 'PATCH',
        body: JSON.stringify({ fullName: 'Updated Name' }),
      });

      const response = await PATCH(request);
      expect(response.status).toBe(401);
    });

    it('returns 404 if profile not found', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', email: 'test@example.com' },
        expires: new Date().toISOString(),
      });
      mockPrisma.reviewerProfile.findUnique.mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost/api/reviewer-profile', {
        method: 'PATCH',
        body: JSON.stringify({ fullName: 'Updated Name' }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Reviewer profile not found');
    });

    it('updates profile successfully', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', email: 'test@example.com' },
        expires: new Date().toISOString(),
      });
      mockPrisma.reviewerProfile.findUnique.mockResolvedValueOnce(mockReviewerProfile);
      mockPrisma.reviewerProfile.update.mockResolvedValueOnce({
        ...mockReviewerProfile,
        fullName: 'Updated Name',
      });

      const request = new NextRequest('http://localhost/api/reviewer-profile', {
        method: 'PATCH',
        body: JSON.stringify({ fullName: 'Updated Name' }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile.fullName).toBe('Updated Name');
    });

    it('updates showOnTeamPage field', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', email: 'test@example.com' },
        expires: new Date().toISOString(),
      });
      mockPrisma.reviewerProfile.findUnique.mockResolvedValueOnce(mockReviewerProfile);
      mockPrisma.reviewerProfile.update.mockResolvedValueOnce({
        ...mockReviewerProfile,
        showOnTeamPage: false,
      });

      const request = new NextRequest('http://localhost/api/reviewer-profile', {
        method: 'PATCH',
        body: JSON.stringify({ showOnTeamPage: false }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile.showOnTeamPage).toBe(false);
    });
  });
});
