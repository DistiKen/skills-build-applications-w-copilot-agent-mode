import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function createHttpError(message: string, status = 400) {
  return Object.assign(new Error(message), { status });
}

function parseObjectId(value: unknown, label: string) {
  if (typeof value !== 'string' || !mongoose.Types.ObjectId.isValid(value)) {
    throw createHttpError(`${label} must be a valid MongoDB ObjectId`, 400);
  }
  return new mongoose.Types.ObjectId(value);
}

function parseName(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createHttpError(`${label} is required`, 400);
  }
  return value.trim();
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1 }).lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw createHttpError('Activity payload is required', 400);
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  const normalizedUserId = parseObjectId(userId, 'userId');
  const normalizedTeamId = parseObjectId(teamId, 'teamId');
  const normalizedType = parseName(type, 'type');

  if (!Number.isFinite(minutes) || Number(minutes) <= 0) {
    throw createHttpError('minutes must be a positive number', 400);
  }

  const user = await User.findById(normalizedUserId);
  const team = await Team.findById(normalizedTeamId);

  if (!user) {
    throw createHttpError('User not found', 400);
  }
  if (!team) {
    throw createHttpError('Team not found', 400);
  }

  const points = Number(minutes);
  const activity = await Activity.create({
    user: normalizedUserId,
    team: normalizedTeamId,
    type: normalizedType,
    minutes: points,
    points,
    occurredAt: new Date(),
  });

  return activity.toObject();
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw createHttpError('Team payload is required', 400);
  }

  const payload = input as Record<string, unknown>;
  const name = parseName(payload.name, 'name');
  const mascot = parseName(payload.mascot, 'mascot');

  const membersValue = payload.members ?? [];
  if (!Array.isArray(membersValue)) {
    throw createHttpError('members must be an array of user IDs', 400);
  }

  const members = membersValue.map((member) => parseObjectId(member, 'member'));
  const team = await Team.create({ name, mascot, members });
  return team.toObject();
}

export async function getLeaderboard() {
  const rows = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1, _id: 1 } },
  ]);

  const leaderboard = await Promise.all(rows.map(async (row, index) => {
    const team = await Team.findById(row._id).lean();
    return {
      teamName: team?.name ?? 'Unknown team',
      totalPoints: Number(row.totalPoints ?? 0),
      rank: index + 1,
    };
  }));

  return leaderboard;
}

export async function suggestWorkouts(userEmail: string) {
  const email = typeof userEmail === 'string' ? userEmail.trim() : '';
  const user = await User.findOne({ email }).lean();

  if (!user) {
    throw createHttpError('User not found', 404);
  }

  const recentActivities = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).lean();
  const recentTypes = recentActivities.map((activity) => String(activity.type)).filter(Boolean);
  const focusCandidates = [
    user.fitnessGoal,
    ...recentTypes,
    ...recentTypes.map((type) => type.toLowerCase()),
  ].filter(Boolean) as string[];

  const preferredFocus = focusCandidates[0]?.toLowerCase() ?? 'endurance';

  const workoutMatches = await Workout.find({
    focus: { $regex: new RegExp(preferredFocus, 'i') },
  }).lean();

  const fallback = await Workout.find().lean();
  const suggestions = (workoutMatches.length ? workoutMatches : fallback)
    .map((workout) => {
      const focus = String(workout.focus ?? '').trim();
      const reasonText = recentTypes.length
        ? `Matches recent activity (${recentTypes.join(', ')}) and your goal: ${user.fitnessGoal ?? 'fitness'}.`
        : `Matches your goal: ${user.fitnessGoal ?? 'fitness'}.`;

      return {
        ...workout,
        focus,
        reason: `${reasonText} Recommended focus is ${focus || preferredFocus}.`,
      };
    })
    .sort((a, b) => {
      const aScore = a.focus.toLowerCase() === preferredFocus ? 1 : 0;
      const bScore = b.focus.toLowerCase() === preferredFocus ? 1 : 0;
      return bScore - aScore;
    });

  return suggestions.slice(0, 3);
}

export { User };
