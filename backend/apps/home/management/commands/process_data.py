# data_manager/management/commands/process_data.py

import csv
from datetime import datetime, timedelta
import io
import logging
from pathlib import Path
import shutil
import urllib.request
import zipfile

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.core.models import Exchanges, Instrument, Percentage

logger = logging.getLogger(__name__)

REQUIRED_EXCHANGES = {
    "BSE": {"code": "1", "exchange": "BSE", "is_option": False},
    "FON": {"code": "4", "exchange": "NFO", "is_option": True},
    "NSE": {"code": "4", "exchange": "NSE", "is_option": False},
}

# Column mappings for each exchange type
EXCHANGE_COLUMN_MAPPINGS = {
    "NSE": {
        "token": 0,
        "short_name": 1,
        "series": 2,
        "company_name": 3,
        "exchange_code": -1,  # Last column
    },
    "BSE": {
        "token": 0,
        "short_name": 1,
        "series": 2,
        "company_name": 3,
        "exchange_code": -1,  # Last column
    },
    "FON": {
        "token": 0,
        "instrument": 1,
        "short_name": 2,
        "series": 3,
        "expiry_date": 4,
        "strike_price": 5,
        "option_type": 6,
        "company_name": 29,  # CompanyName is at index 29
        "exchange_code": -1,  # Last column
    },
}

CHUNK_SIZE = 1000  # Number of records to process in bulk


class Command(BaseCommand):
    help = "Processes master data and loads instruments as needed."

    def handle(self, *args, **options):
        try:
            self.stdout.write(self.style.NOTICE("Starting data processing..."))

            # Step 1: Handle Exchanges
            self.process_exchanges()

            # Step 2: Handle Instruments for Each Exchange
            self.process_instruments()

            self.stdout.write(
                self.style.SUCCESS("Data processing completed successfully.")
            )

        except Exception as e:
            logger.error("An error occurred during data processing", exc_info=True)
            self.stderr.write(self.style.ERROR(f"An error occurred: {e}"))

    def needs_reprocessing(self, exchange):
        """
        Check if an exchange needs reprocessing based on date criteria.
        Returns True if:
        - created_at is None
        - updated_at is None
        - updated_at is more than 7 days old
        """
        if exchange.created_at is None or exchange.updated_at is None:
            return True

        seven_days_ago = timezone.now() - timedelta(days=7)
        return exchange.updated_at < seven_days_ago

    def process_exchanges(self):
        """
        Downloads and processes the master data if required exchanges are missing or outdated.
        """
        existing_exchanges = Exchanges.objects.filter(
            title__in=REQUIRED_EXCHANGES.keys()
        )
        existing_exchange_titles = set(
            existing_exchanges.values_list("title", flat=True)
        )
        missing_exchanges = set(REQUIRED_EXCHANGES.keys()) - existing_exchange_titles

        # Check for exchanges that need reprocessing due to date criteria
        outdated_exchanges = []
        for exchange in existing_exchanges:
            if self.needs_reprocessing(exchange):
                outdated_exchanges.append(exchange.title)

        exchanges_to_process = missing_exchanges.union(set(outdated_exchanges))

        if not exchanges_to_process:
            self.stdout.write(
                self.style.SUCCESS(
                    "All required exchanges are up to date. Skipping download and extraction."
                )
            )
            return
        else:
            if missing_exchanges:
                self.stdout.write(
                    self.style.WARNING(
                        f"Missing exchanges: {', '.join(missing_exchanges)}"
                    )
                )
            if outdated_exchanges:
                self.stdout.write(
                    self.style.WARNING(
                        f"Outdated exchanges (>7 days or None dates): {', '.join(outdated_exchanges)}"
                    )
                )
            self.stdout.write(self.style.NOTICE("Proceeding to download and process."))

        url = "https://directlink.icicidirect.com/NewSecurityMaster/SecurityMaster.zip"
        zip_path = Path(settings.MEDIA_ROOT) / "SecurityMaster.zip"
        extracted_path = Path(settings.MEDIA_ROOT) / "extracted"

        try:
            # Ensure media directory exists
            media_root = Path(settings.MEDIA_ROOT)
            media_root.mkdir(parents=True, exist_ok=True)
            self.stdout.write(
                self.style.NOTICE(f"Ensured media directory exists: {media_root}")
            )

            # Remove extracted directory if it exists
            if extracted_path.exists():
                shutil.rmtree(extracted_path)
                self.stdout.write(
                    self.style.WARNING(f"Removed existing directory: {extracted_path}")
                )

            # Download the zip file
            self.stdout.write(self.style.NOTICE(f"Downloading from {url}..."))
            urllib.request.urlretrieve(url, zip_path)
            self.stdout.write(self.style.SUCCESS(f"Downloaded zip to {zip_path}"))

            # Extract the zip file
            with zipfile.ZipFile(zip_path, "r") as zf:
                zf.extractall(extracted_path)
                self.stdout.write(
                    self.style.SUCCESS(f"Extracted zip to {extracted_path}")
                )

                # Prepare bulk operations
                _ = []
                exchanges_to_update = []

                for extracted_file in zf.namelist():
                    exchange_title = extracted_file[:3]

                    if exchange_title not in REQUIRED_EXCHANGES:
                        logger.warning(
                            f"Unknown exchange title: {exchange_title}, skipping."
                        )
                        continue

                    if exchange_title not in exchanges_to_process:
                        logger.info(
                            f"Exchange '{exchange_title}' is up to date. Skipping update."
                        )
                        continue

                    exchange_file_path = extracted_path / extracted_file
                    exchange_info = REQUIRED_EXCHANGES[exchange_title]

                    exchange_qs = Exchanges.objects.filter(title=exchange_title)

                    if exchange_qs.exists():
                        # Prepare for bulk update
                        exchange = exchange_qs.first()
                        # Convert Path to Django File object
                        with Path.open(exchange_file_path, "rb") as f:
                            django_file = File(f, name=extracted_file)
                            exchange.file.save(extracted_file, django_file, save=False)
                        # Clear existing instruments for this exchange since we're reprocessing
                        Instrument.objects.filter(exchange=exchange).delete()
                        self.stdout.write(
                            self.style.WARNING(
                                f"Cleared existing instruments for exchange: {exchange_title}"
                            )
                        )
                        exchanges_to_update.append(exchange)
                    else:
                        # Create new exchange and save file properly
                        new_exchange = Exchanges(
                            title=exchange_title,
                            code=exchange_info["code"],
                            exchange=exchange_info["exchange"],
                            is_option=exchange_info.get("is_option", False),
                        )
                        # Save the exchange first to get an ID
                        new_exchange.save()
                        # Then save the file
                        with Path.open(exchange_file_path, "rb") as f:
                            django_file = File(f, name=extracted_file)
                            new_exchange.file.save(
                                extracted_file, django_file, save=True
                            )

                        self.stdout.write(
                            self.style.SUCCESS(
                                f"Created new Exchange entry for: {exchange_title}"
                            )
                        )

                # Bulk update existing exchanges (save them after file operations)
                if exchanges_to_update:
                    with transaction.atomic():
                        for exchange in exchanges_to_update:
                            exchange.save()
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Updated {len(exchanges_to_update)} existing Exchange entries."
                        )
                    )

            # Clean up
            zip_path.unlink()
            self.stdout.write(self.style.SUCCESS(f"Removed zip file: {zip_path}"))

        except Exception as e:
            logger.error("Error processing exchanges", exc_info=True)
            self.stderr.write(self.style.ERROR(f"Error processing exchanges: {e}"))
            raise CommandError(f"Error processing exchanges: {e}") from e

    def process_instruments(self):
        """
        Loads instrument data for each exchange if no instruments exist for that exchange
        or if the exchange was recently updated.
        """
        exchanges = Exchanges.objects.filter(title__in=REQUIRED_EXCHANGES.keys())

        for ins in exchanges:
            self.stdout.write(
                self.style.NOTICE(
                    f"Processing instruments for Exchange: {ins.title} (ID: {ins.id})"
                )
            )

            # Check if Instruments already exist for this exchange and exchange is not recently updated
            if Instrument.objects.filter(
                exchange=ins
            ).exists() and not self.needs_reprocessing(ins):
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Instruments for Exchange '{ins.title}' already exist and are up to date. Skipping data loading."
                    )
                )
                continue

            try:
                per, created = Percentage.objects.get_or_create(source=ins.title)

                # Pre-fetch existing instruments tokens for quick lookup
                existing_tokens = set(
                    Instrument.objects.filter(exchange=ins).values_list(
                        "token", flat=True
                    )
                )

                # Handle both local and cloud storage
                try:
                    # Try to get local path first (for local development)
                    file_path = ins.file.path
                    if not Path(file_path).exists():
                        self.stdout.write(
                            self.style.ERROR(
                                f"File does not exist: {file_path}. Skipping this exchange."
                            )
                        )
                        continue
                    # Use local file path
                    file_handle = Path(file_path).open(encoding="utf-8")
                except NotImplementedError:
                    # Cloud storage doesn't support absolute paths
                    # Open the file directly from storage
                    try:
                        # For cloud storage, we need to read as binary then decode
                        binary_file = ins.file.open("rb")
                        file_content = binary_file.read().decode("utf-8")
                        binary_file.close()
                        file_handle = io.StringIO(file_content)
                        self.stdout.write(
                            self.style.NOTICE(
                                f"Opened file from cloud storage for exchange: {ins.title}"
                            )
                        )
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(
                                f"Could not open file from storage for exchange {ins.title}: {e}. Skipping."
                            )
                        )
                        continue

                # Get column mapping for this exchange
                column_mapping = EXCHANGE_COLUMN_MAPPINGS.get(ins.title)
                if not column_mapping:
                    self.stdout.write(
                        self.style.ERROR(
                            f"No column mapping found for exchange: {ins.title}. Skipping."
                        )
                    )
                    continue

                ins_list = []
                line_count = 0

                with file_handle as f:
                    reader = csv.reader(f)
                    next(reader, None)  # Skip header

                    for index, data in enumerate(
                        reader, start=2
                    ):  # Start at 2 considering header
                        # Validate minimum required columns based on exchange type
                        min_columns = max(
                            abs(v)
                            for v in column_mapping.values()
                            if isinstance(v, int)
                        )
                        if len(data) < min_columns:
                            logger.warning(
                                f"Skipping malformed line {index}: insufficient columns ({len(data)} < {min_columns})"
                            )
                            continue

                        try:
                            token = data[column_mapping["token"]].strip()
                            if not token:
                                continue

                            if token in existing_tokens:
                                continue

                            # Common fields for all exchanges
                            short_name = data[column_mapping["short_name"]].strip()
                            exchange_code = data[
                                column_mapping["exchange_code"]
                            ].strip()

                            if ins.is_option:
                                # For options (FON)
                                instrument_name = data[
                                    column_mapping["instrument"]
                                ].strip()
                                series = data[column_mapping["series"]].strip()
                                company_name = data[
                                    column_mapping["company_name"]
                                ].strip()

                                # Handle expiry date
                                expiry_date = None
                                expiry_str = data[column_mapping["expiry_date"]].strip()
                                if expiry_str:
                                    try:
                                        expiry_date = datetime.strptime(
                                            expiry_str, "%d-%b-%Y"
                                        ).date()
                                    except ValueError:
                                        try:
                                            expiry_date = datetime.strptime(
                                                expiry_str, "%Y-%m-%d"
                                            ).date()
                                        except ValueError:
                                            logger.warning(
                                                f"Could not parse expiry date '{expiry_str}' for token {token}"
                                            )

                                # Handle strike price
                                strike_price = 0.0
                                strike_str = data[
                                    column_mapping["strike_price"]
                                ].strip()
                                if strike_str:
                                    try:
                                        strike_price = float(strike_str)
                                    except ValueError:
                                        logger.warning(
                                            f"Could not parse strike price '{strike_str}' for token {token}"
                                        )

                                option_type = data[
                                    column_mapping["option_type"]
                                ].strip()

                                instrument = Instrument(
                                    exchange=ins,
                                    stock_token=f"{ins.code}.1!{token}",
                                    token=token,
                                    instrument=instrument_name,
                                    short_name=short_name,
                                    series=series,
                                    company_name=company_name,
                                    expiry=expiry_date,
                                    strike_price=strike_price,
                                    option_type=option_type,
                                    exchange_code=exchange_code,
                                )
                            else:
                                # For equity exchanges (NSE, BSE)
                                series = data[column_mapping["series"]].strip()
                                company_name = data[
                                    column_mapping["company_name"]
                                ].strip()

                                instrument = Instrument(
                                    exchange=ins,
                                    stock_token=f"{ins.code}.1!{token}",
                                    token=token,
                                    instrument=short_name,
                                    short_name=short_name,
                                    series=series,
                                    company_name=company_name,
                                    exchange_code=exchange_code,
                                )

                            ins_list.append(instrument)
                            line_count += 1

                            if len(ins_list) >= CHUNK_SIZE:
                                Instrument.objects.bulk_create(
                                    ins_list, ignore_conflicts=True
                                )
                                ins_list.clear()
                                # Update progress
                                per.value = (
                                    index / 100000
                                ) * 100  # Adjust denominator as needed based on total lines
                                per.save()

                        except Exception as e:
                            logger.error(
                                f"Error processing line {index} for exchange {ins.title}: {e}",
                                exc_info=True,
                            )

                # Bulk create any remaining instruments
                if ins_list:
                    Instrument.objects.bulk_create(ins_list, ignore_conflicts=True)

                # Final progress update
                per.value = 100
                per.save()
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Data loading for Exchange '{ins.title}' completed successfully. Inserted {line_count} instruments."
                    )
                )

            except Exception as e:
                logger.error(
                    f"An unexpected error occurred while loading instruments for Exchange '{ins.title}': {e}",
                    exc_info=True,
                )
                self.stderr.write(
                    self.style.ERROR(
                        f"An unexpected error occurred while loading instruments for Exchange '{ins.title}': {e}"
                    )
                )
                # Ensure file handle is closed in case of error
                try:
                    if "file_handle" in locals():
                        file_handle.close()
                except Exception as e:
                    logger.warning(
                        f"Failed to close file handle for exchange {ins.title} after error: {e}"
                    )
