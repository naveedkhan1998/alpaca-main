from datetime import datetime


def date_parser(date_obj: datetime) -> str:
    """
    'input':datetime object
    'output': datetime str in this format 2023-07-01T07:00:00.000Z
    """
    # dt = datetime(2023, 7, 1, 7, 0, 0)
    # Convert datetime to string
    formatted_string = date_obj.strftime("%Y-%m-%dT%H:%M:%S.000Z")
    return formatted_string  # Output: 2023-07-01T07:00:00.000Z
