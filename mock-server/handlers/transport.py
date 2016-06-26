"""Mapping with WebSockets and Google Maps."""
import json
import logging
from tornado.web import RequestHandler
from tornado import gen
from datetime import datetime


class Arrivals(RequestHandler):
    """Mock TransportAPI arrivals resposne."""

    @gen.coroutine
    def get(self, to_home):
        """Render index page."""
        logging.info('Mocking data with home_state={}'.format(to_home))
        if to_home == 'true':
            filepath = "static/home_to_work.json"
        else:
            filepath = "static/work_to_home.json"

        with open(filepath, "r") as f:
            data = (f.read()
                     .replace("<hour_A>",
                              "{:02d}".format(datetime.now().hour))
                     .replace("<hour_B>",
                              "{:02d}".format(datetime.now().hour + 1))
                    )
            json_data = json.loads(data)
        self.write(json_data)
