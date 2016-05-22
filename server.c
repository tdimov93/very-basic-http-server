#include "server.h"

#define RES_PATH_DEFAULT "/index.html"
//response codes
#define OK_200 "200 OK"
#define NOT_FOUND_404 "404 NOT FOUND"
#define SERVER_ERROR_500 "500 SERVER ERROR"
//content-types
#define TEXT_HTML "text/html"
#define TEXT_CSS "text/css"
#define IMAGE_ICO "image/x-icon"
#define APP_JS "application/javascript"

#define EXT_HTML "html"
#define EXT_CSS "css"
#define EXT_JS "js"
#define EXT_ICO "ico"

#define RESP_END "\r\n\r\n"

bool running;

char header[] = "HTTP/1.0 %s\r\nDate: Fri, 20 May 2016 20:30:01 CET\r\nContent-Type: %s\r\n%s%s";

int parse_file(char** resp, const char* filename) {
	char ffilename[256];
	sprintf(ffilename, "www%s", filename);
	if ( access (ffilename, F_OK) == -1 ) {
		//file doesn't exist
		return -1;
	}
	FILE* f_handle = fopen(ffilename, "r");
	if (f_handle == NULL) {
		//problem with file or permissions
		return 0;
	}
	int msg_length = MESSAGE_SIZE;
	int r_bytes = 0;
	char buffer[256];
	int offset = 0;
	offset = sprintf(*resp + offset, "%s", "\r\n");
	while ((r_bytes = fread(buffer, sizeof(char), 255, f_handle)) > 0) {
		buffer[r_bytes] = '\0';
		if (offset + 256 >= msg_length) {
			if (!(*resp = (char*) realloc(*resp, msg_length * 2))) {
				exit(EXIT_FAILURE);
			}
			msg_length = msg_length * 2;
		}
		offset += sprintf(*resp + offset, "%s", buffer);
	}
	fclose(f_handle);
	return offset;
}

int main(int argc, char** argv) {
	int server_socket, i;
	struct sockaddr_in my_addr, cl_addr;

	printf("my pid : %d\n", getpid());
	struct sigaction interrupt;
	memset(&interrupt, 0, sizeof(interrupt));
	interrupt.sa_handler = &interrupt_handler;
	sigaction(SIGINT, &interrupt, NULL);

	init_server(&server_socket, &my_addr);
	running = TRUE;
	while (running) {
		int i;
		handle_request(server_socket, &my_addr);
	}
	shutdown_socket(server_socket);
	return EXIT_SUCCESS;
}

void interrupt_handler(int signum) {
	if (signum == SIGINT) {
		running = FALSE;
	}
}

void init_server(int *server_socket,struct sockaddr_in *my_addr) {

	if ((*server_socket = socket(AF_INET, SOCK_STREAM, 0)) == -1) {
		perror("Socket");
		exit(EXIT_FAILURE);
	}

	memset(my_addr, 1, sizeof(struct sockaddr_in));
	my_addr->sin_family = AF_INET;
	my_addr->sin_port = htons(PORT);
	my_addr->sin_addr.s_addr = htonl(INADDR_ANY);
	//memset(&(my_addr->sin_zero), '\0', 8);

	if (bind(*server_socket, (struct sockaddr *)my_addr, sizeof(*my_addr)) == -1) {
		my_addr->sin_port = htons(PORT+1);
		if (bind(*server_socket, (struct sockaddr *)my_addr, sizeof(*my_addr)) == -1) {
			perror("Bind");
			exit(EXIT_FAILURE);
		}
		printf("listening on port %d\n", PORT+1);
	} else {
		printf("listening on port %d\n", PORT);
	}

	if (listen(*server_socket, BACKLOG)) {
		perror("Listen");
		exit(EXIT_FAILURE);
	}
}

void handle_request(int server_socket, struct sockaddr_in *cl_addr) {
	int new_cl_socket;
	int cl_addr_length = sizeof(struct sockaddr_in);
	if ((new_cl_socket = accept(server_socket, (struct sockaddr *)cl_addr, (socklen_t*) &cl_addr_length)) < 0) {
		if (errno != EINTR) {
			perror("Connection error");
			exit(EXIT_FAILURE);
		}
	} else {
		char* message;//entire message
		char* f_buffer; //requested ressource
		if (!(message = (char*) malloc(MESSAGE_SIZE * sizeof(char)))) {
			perror("malloc");
			exit(EXIT_FAILURE);
		}
		if (!(f_buffer = (char*) malloc(MESSAGE_SIZE * sizeof(char)))) {
			perror("malloc");
			exit(EXIT_FAILURE);
		}

		memset(message, 0, MESSAGE_SIZE * sizeof(char));
		memset(f_buffer, 0, MESSAGE_SIZE * sizeof(char));
		char* msg = message;

		size_t req_length = recv(new_cl_socket, msg, MESSAGE_SIZE, 0);

		//char fgts[16];
		//printf("request received : \n%s\n", msg);
		//fgets(fgts, 15, stdin);
		char req_method[8], req_path[64];
		char* response_code = OK_200;
		sprintf(req_method, "%s", extract_req_method(&msg));
		sprintf(req_path, "%s", extract_req_path(&msg));
		char* content_type = get_content_type(req_path);
		printf("response-content type : %s\n", content_type);
		//clear buffer for the response
		memset(message, 0, req_length * sizeof(char));
		int header_length = strlen(header);
		char* ressource_path;
		if (!strcmp(req_path, "/")) {
			ressource_path = RES_PATH_DEFAULT;
		} else {
			ressource_path = req_path;
		}
		int parse_res = parse_file(&f_buffer, ressource_path);
		if (parse_res == -1) {
			printf("ressource not found!\n");
			response_code = NOT_FOUND_404;
		} else if (!parse_res) {
			printf("could not parse file!\n");
			response_code = SERVER_ERROR_500;
		}
		if (parse_res < 0) {
			parse_res = 0;
		}
		header_length += strlen(content_type) + strlen(response_code);
		int msg_capacity = MESSAGE_SIZE;
		if (parse_res + header_length >= msg_capacity) {
			if (!(message = (char*) realloc(message, parse_res + header_length + 16))) {
				perror("realloc");
				exit(EXIT_FAILURE);
			}
		}
		sprintf(message, header, response_code, content_type, f_buffer, RESP_END);
		//printf("prepared message : \n%s\n", message);
		send_prepared_msg(message, new_cl_socket);
		printf("response size : %d bytes", (int)strlen(message));
		printf("\t%.2f kbytes\n", (float)strlen(message) / 1024);
		//free ressources
		close(new_cl_socket);
		free(f_buffer);
		free(message);
	}
}

bool receive_msg(char* msg, int fd) {
	int bytes_received;
	if ((bytes_received = recv(fd, msg, MESSAGE_SIZE, 0)) <= 0) {
		if (bytes_received == 0) {
			printf("Client disconnected.\n");
		}
		else {
			perror("Could not receive message");
		}
		return FALSE;
	}
	return TRUE;
}

void shutdown_socket(int socket) {
	printf("Shutting down socket number %d\n", socket);
	if (close(socket) < 0) {
		perror("Socket shutdown");
		exit(EXIT_FAILURE);
	}
}

char* get_content_type(char* path) {
	int i;
	char* extension = NULL;
	//find the requested ressource extension
	for (i = strlen(path)-1; i > 0; i--) {
		if (path[i] == '.') {
			extension = path + i + 1;
			break;
		}
	}
	if (extension == NULL) { //requested ressource is most probably /
		return TEXT_HTML;
	} else if (!strcmp(extension, EXT_CSS)) {
		return TEXT_CSS;
	} else if (!strcmp(extension, EXT_JS)) {
		return APP_JS;
	} else if (!strcmp(extension, EXT_ICO)) {
		return IMAGE_ICO;
	}
	return TEXT_HTML; //extension not supported at the moment
}

