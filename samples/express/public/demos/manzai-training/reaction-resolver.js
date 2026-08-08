export function resolveReactionMotion(reaction, motions) {
  if (!reaction || !Array.isArray(motions) || motions.length === 0) {
    return null;
  }

  const usableMotions = motions.filter(
    (motion) =>
      typeof motion?.id === "string" &&
      motion.id.trim() &&
      Array.isArray(motion.tags),
  );

  if (reaction.motionId) {
    const exactMatch = usableMotions.find(
      (motion) => motion.id === reaction.motionId,
    );
    if (exactMatch) return exactMatch;
  }

  const variant = Number.isInteger(reaction.variant)
    ? Math.max(0, reaction.variant)
    : 0;
  for (const tag of reaction.motionTags ?? []) {
    const matches = usableMotions.filter((motion) => motion.tags.includes(tag));
    if (matches.length > 0) return matches[variant % matches.length];
  }

  return null;
}

export function buildPresentationContent(text, reaction, motions) {
  const motion = resolveReactionMotion(reaction, motions);
  if (!motion) return { content: text, motion: null };

  const priority = Number.isInteger(reaction.priority)
    ? reaction.priority
    : 1;
  const markup = `[MOTION ${motion.id}:${priority}]`;
  const content =
    reaction.cue === "end" ? `${text} ${markup}` : `${markup} ${text}`;

  return { content, motion };
}
