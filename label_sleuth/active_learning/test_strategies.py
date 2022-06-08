import random
import unittest

from label_sleuth.active_learning.strategies.hard_example_mining import HardMiningLearner
from label_sleuth.active_learning.strategies.hybrid_learner import HybridLearner
from label_sleuth.active_learning.strategies.random_sampling import RandomSampling
from label_sleuth.active_learning.strategies.retrospective import RetrospectiveLearner

from label_sleuth.data_access.file_based.utils import URI_SEP
from label_sleuth.data_access.core.data_structs import Document, TextElement, Label, LABEL_NEGATIVE
from label_sleuth.models.core.prediction import Prediction


def generate_simple_doc(dataset_name, category_name, num_sentences, doc_id=0):
    sentence_template = 'This is sentence number :{}'
    sentences = [sentence_template.format(idx) for idx in range(num_sentences)]

    text_elements = []
    start_span = 0
    for idx, sentence in enumerate(sentences):
        end_span = start_span + len(sentence)
        mock_label = {category_name: Label(LABEL_NEGATIVE)}
        text_elements.append(TextElement(uri=URI_SEP.join([dataset_name, str(doc_id), str(idx)]), text=sentence,
                                         span=[(start_span, end_span)], metadata={}, category_to_label=mock_label))
        start_span = end_span + 1

    doc = Document(uri=dataset_name + URI_SEP + str(doc_id), text_elements=text_elements, metadata={})
    return doc


class TestActiveLearningStrategies(unittest.TestCase):
    def test_random_reproducibility(self):
        al = RandomSampling()
        doc = generate_simple_doc("dummy_dataset", "dummy_category", num_sentences=100)
        predictions = [Prediction(True, random.random()) for _ in doc.text_elements]
        sorted_items_for_labeling1 = al.get_recommended_items_for_labeling("dummy_workspace", "dummy_dataset",
                                                                           "dummy_category", doc.text_elements,
                                                                           predictions, sample_size=100)
        sorted_items_for_labeling2 = al.get_recommended_items_for_labeling("dummy_workspace", "dummy_dataset",
                                                                           "dummy_category", doc.text_elements,
                                                                           predictions, sample_size=100)
        self.assertEqual(sorted_items_for_labeling1, sorted_items_for_labeling2)

    def test_hard_mining(self):
        al = HardMiningLearner()
        doc = generate_simple_doc("dummy_dataset", "dummy_category", num_sentences=5)
        predictions = [Prediction(True, 1), Prediction(True, 0),
                       Prediction(True, 0.51), Prediction(True, 0.5001), Prediction(True, 0.52)]
        sorted_items_for_labeling = al.get_recommended_items_for_labeling("dummy_workspace", "dummy_dataset",
                                                                          "dummy_category", doc.text_elements,
                                                                          predictions, sample_size=2)

        self.assertEqual(doc.text_elements[3], sorted_items_for_labeling[0])
        self.assertEqual(doc.text_elements[2], sorted_items_for_labeling[1])

    def test_retrospective(self):
        al = RetrospectiveLearner()
        doc = generate_simple_doc("dummy_dataset", "dummy_category", num_sentences=5)
        predictions = [Prediction(True, 0.56), Prediction(True, 0),
                       Prediction(True, 0.99), Prediction(True, 1), Prediction(True, 0.52)]
        sorted_items_for_labeling = al.get_recommended_items_for_labeling("dummy_workspace", "dummy_dataset",
                                                                          "dummy_category", doc.text_elements,
                                                                          predictions, sample_size=2)

        self.assertEqual(doc.text_elements[3], sorted_items_for_labeling[0])
        self.assertEqual(doc.text_elements[2], sorted_items_for_labeling[1])

    def test_hybrid_learner(self):
        al = HybridLearner(HardMiningLearner(), RetrospectiveLearner())
        doc = generate_simple_doc("dummy_dataset", "dummy_category", num_sentences=5)
        predictions = [Prediction(True, 0), Prediction(True, 0.2),
                       Prediction(True, 0.5), Prediction(True, 0.75), Prediction(True, 1)]
        sorted_items_for_labeling = al.get_recommended_items_for_labeling("dummy_workspace", "dummy_dataset",
                                                                          "dummy_category", doc.text_elements,
                                                                          predictions, sample_size=2)
        self.assertEqual(doc.text_elements[2], sorted_items_for_labeling[0])
        self.assertEqual(doc.text_elements[3], sorted_items_for_labeling[1])