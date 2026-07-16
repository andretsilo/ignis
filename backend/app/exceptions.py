class JobNotFound(Exception):
    def __init__(self, message):
        super().__init__(message)
        self.message = message
    
    def __str__(self):
        return f"{self.message} (Error code: 404)"
    
class JobNotCancellable(Exception):
    def __init__(self, message, error_code):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
    
    def __str__(self):
        return f"{self.message}"
