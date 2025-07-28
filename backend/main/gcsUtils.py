from storages.backends.gcloud import GoogleCloudStorage


def Media():
    return GoogleCloudStorage(location="media")


def Static():
    return GoogleCloudStorage(location="static")
