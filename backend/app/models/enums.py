import enum


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    DEVELOPER = "DEVELOPER"


class AvailabilityStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    PARTIAL = "PARTIAL"
    UNAVAILABLE = "UNAVAILABLE"


class ProjectStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"


class TaskPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class TaskComplexity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class TaskStatus(str, enum.Enum):
    TODO = "TODO"
    READY = "READY"
    IN_PROGRESS = "IN_PROGRESS"
    IN_REVIEW = "IN_REVIEW"
    COMPLETED = "COMPLETED"
    BLOCKED = "BLOCKED"
    CANCELLED = "CANCELLED"



class AssignmentStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    REASSIGNED = "REASSIGNED"
    CANCELLED = "CANCELLED"


class ShapDirection(str, enum.Enum):
    POSITIVE = "POSITIVE"
    NEGATIVE = "NEGATIVE"


class FeedbackDecision(str, enum.Enum):
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    IGNORED = "IGNORED"
    DEFERRED = "DEFERRED"


class OutcomeStatus(str, enum.Enum):
    RECOMMENDED = "RECOMMENDED"
    ACCEPTED = "ACCEPTED"
    ASSIGNED = "ASSIGNED"
    COMPLETED = "COMPLETED"


class LabelStatus(str, enum.Enum):
    UNLABELED = "UNLABELED"
    WEAK_LABEL = "WEAK_LABEL"
    VALIDATED_LABEL = "VALIDATED_LABEL"
    AMBIGUOUS = "AMBIGUOUS"


class ValidationStatus(str, enum.Enum):
    UNVALIDATED = "UNVALIDATED"
    VALIDATED_POSITIVE = "VALIDATED_POSITIVE"
    VALIDATED_NEGATIVE = "VALIDATED_NEGATIVE"
    REJECTED_LABEL = "REJECTED_LABEL"
    AMBIGUOUS = "AMBIGUOUS"


class ReadinessStatus(str, enum.Enum):
    NOT_READY = "NOT_READY"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    READY_FOR_EXPERIMENT = "READY_FOR_EXPERIMENT"

