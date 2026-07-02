from .classifier import EmailClassifier
from .services import AIAnalysisService


class DecisionEngine:
    """
    Coordinates classification and database storage.
    """

    def __init__(self):
        self.classifier = EmailClassifier()

    def analyze(self, email_metadata, email_body):

        decision = AIAnalysisService.get_decision(
            email_metadata
        )

        if decision:
            return decision

        decision = self.classifier.classify(
            email_body
        )

        AIAnalysisService.save_decision(
            email_metadata,
            decision,
        )

        return decision