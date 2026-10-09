import datetime
from decimal import Decimal
from django.test import SimpleTestCase

from api.miller_employees_function.miller_procurement.receiving_orders.services import (
    extract_contact_initials,
    extract_first2_business,
    extract_first3_product,
    extract_last4_batch,
    _parse_decimal,
    ReceivingValidationError,
)


class ReceivingOrdersFormattingTests(SimpleTestCase):
    def test_extract_fragments_and_reference_formats(self):
        # LAST4BATCH
        self.assertEqual(extract_last4_batch("DIN-RI-20261008-0529"), "0529")
        self.assertEqual(extract_last4_batch("DIN - RI - 20261008 - 0529"), "0529")
        self.assertEqual(extract_last4_batch("BATCH-001"), "T001")

        # FIRST2BUSINESS
        self.assertEqual(extract_first2_business("Grainrise"), "GR")
        self.assertEqual(extract_first2_business("Riggie Grains"), "RI")

        # CONTACTINITIALS
        self.assertEqual(extract_contact_initials("Juan Magsasaka"), "JM")
        self.assertEqual(extract_contact_initials("Juan"), "JU")
        self.assertEqual(extract_contact_initials(""), "SU")

        # FIRST3PRODUCT
        self.assertEqual(extract_first3_product("Dinurado"), "DIN")
        self.assertEqual(extract_first3_product("Dinorado Palay"), "DIN")

    def test_decimal_parser_validations(self):
        self.assertEqual(_parse_decimal("1500.50"), Decimal("1500.50"))
        with self.assertRaises(ReceivingValidationError):
            _parse_decimal("-5.00", min_val=Decimal("0.00"))
        with self.assertRaises(ReceivingValidationError):
            _parse_decimal("0.00", strictly_positive=True)
        with self.assertRaises(ReceivingValidationError):
            _parse_decimal("abc")

