// Esta função converte uma data em uma string amigável como "2 horas atrás"
export function timeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) {
        const years = Math.floor(interval);
        return years === 1 ? "1 ano atrás" : `${years} anos atrás`;
    }
    interval = seconds / 2592000;
    if (interval > 1) {
        const months = Math.floor(interval);
        return months === 1 ? "1 mês atrás" : `${months} meses atrás`;
    }
    interval = seconds / 86400;
    if (interval > 1) {
        const days = Math.floor(interval);
        return days === 1 ? "1 dia atrás" : `${days} dias atrás`;
    }
    interval = seconds / 3600;
    if (interval > 1) {
        const hours = Math.floor(interval);
        return hours === 1 ? "1 hora atrás" : `${hours} horas atrás`;
    }
    interval = seconds / 60;
    if (interval > 1) {
        const minutes = Math.floor(interval);
        return minutes === 1 ? "1 minuto atrás" : `${minutes} minutos atrás`;
    }
    return "agora mesmo";
}
