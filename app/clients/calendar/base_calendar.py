from abc import ABC, abstractmethod

class BaseCalendarClient(ABC):

    @abstractmethod
    def get_events(self, start_time, end_time):
        pass

    @abstractmethod
    def create_event(self, title, start_time, end_time, attendees):
        pass

    @abstractmethod
    def delete_event(self, event_id):
        pass