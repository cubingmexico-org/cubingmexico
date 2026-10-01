"""Social media routes: temp IG media + typed post publish/download."""

from routes.social import (  # noqa: F401  (registers routes)
    media,
    mollerz,
    nemesis,
    records,
    resultados,
    streaks_monthly,
    summary_unlock,
    upcoming,
    weekly_digest,
    year_recap,
)
from routes.social.blueprint import social_bp

__all__ = ["social_bp"]
